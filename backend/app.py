from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'your-secret-key-change-this'

# ===== DATABASE CONNECTION =====
def get_db():
    return psycopg2.connect(
        dbname="ai_tracker",
        user="postgres",
        password="postgres123",
        host="localhost",
        cursor_factory=RealDictCursor
    )

# ===== AUTH ENDPOINTS =====
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Missing credentials'}), 400

    conn = get_db()
    cur = conn.cursor()

    try:
        password_hash = generate_password_hash(password)
        cur.execute(
            "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING user_id",
            (email, password_hash)
        )
        user_id = cur.fetchone()['user_id']
        conn.commit()

        token = jwt.encode({
            'user_id': user_id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
        }, app.config['SECRET_KEY'], algorithm='HS256')

        return jsonify({'token': token, 'user_id': user_id}), 201
    except psycopg2.IntegrityError:
        conn.rollback()
        return jsonify({'error': 'Email already exists'}), 409
    finally:
        cur.close()
        conn.close()


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        "SELECT user_id, password_hash FROM users WHERE email = %s",
        (email,)
    )
    user = cur.fetchone()

    if not user or not check_password_hash(user['password_hash'], password):
        cur.close()
        conn.close()
        return jsonify({'error': 'Invalid credentials'}), 401

    token = jwt.encode({
        'user_id': user['user_id'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
    }, app.config['SECRET_KEY'], algorithm='HS256')

    cur.close()
    conn.close()

    return jsonify({'token': token, 'user_id': user['user_id']}), 200


# ===== SESSION TRACKING =====
@app.route('/api/sessions', methods=['POST'])
def create_session():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')

    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload['user_id']
    except:
        return jsonify({'error': 'Invalid token'}), 401

    data = request.json
    tool_name = data.get('tool')
    start_time = datetime.datetime.fromtimestamp(data.get('startTime') / 1000)
    end_time = datetime.datetime.fromtimestamp(data.get('endTime') / 1000)
    query_count = data.get('queryCount', 0)
    duration = data.get('duration', 0)

    conn = get_db()
    cur = conn.cursor()

    try:
        # Get tool_id
        cur.execute("SELECT tool_id FROM ai_tools WHERE tool_name = %s", (tool_name,))
        tool = cur.fetchone()
        if not tool:
            return jsonify({'error': 'Unknown tool'}), 400
        tool_id = tool['tool_id']

        # Insert session
        cur.execute("""
            INSERT INTO sessions (user_id, tool_id, start_time, end_time, query_count, session_duration)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING session_id
        """, (user_id, tool_id, start_time, end_time, query_count, duration))

        session_id = cur.fetchone()['session_id']
        conn.commit()

        return jsonify({'session_id': session_id}), 201
    finally:
        cur.close()
        conn.close()


# ===== DASHBOARD =====
@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload['user_id']
    except:
        return jsonify({'error': 'Invalid token'}), 401
    
    conn = get_db()
    cur = conn.cursor()
    
    # Get today's stats
    today = datetime.date.today()
    cur.execute("""
        SELECT COALESCE(SUM(query_count), 0) as total_queries,
               COALESCE(SUM(session_duration), 0) as total_duration
        FROM sessions
        WHERE user_id = %s 
        AND DATE(start_time) = %s
    """, (user_id, today))
    
    result = cur.fetchone()
    
    # Get count of different tools used today
    cur.execute("""
        SELECT COUNT(DISTINCT tool_id) as tools_count
        FROM sessions
        WHERE user_id = %s 
        AND DATE(start_time) = %s
    """, (user_id, today))
    
    tools_result = cur.fetchone()
    
    stats = {
        'queries_today': result['total_queries'],
        'duration_today': result['total_duration'],
        'tools_used_today': tools_result['tools_count']
    }
    
    cur.close()
    conn.close()
    
    return jsonify(stats), 200

# ===== SEARCH USING TRIE =====

@app.route('/api/search', methods=['GET'])
def search_sessions():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload['user_id']
    except:
        return jsonify({'error': 'Invalid token'}), 401
    
    query = request.args.get('q', '').lower()
    
    if not query:
        return jsonify({'error': 'Query parameter required'}), 400
    
    conn = get_db()
    cur = conn.cursor()
    
    # Get all user sessions with tool names
    cur.execute("""
        SELECT s.session_id, s.start_time, s.query_count, s.session_duration,
               t.tool_name
        FROM sessions s
        JOIN ai_tools t ON s.tool_id = t.tool_id
        WHERE s.user_id = %s
        ORDER BY s.start_time DESC
    """, (user_id,))
    
    sessions = cur.fetchall()
    cur.close()
    conn.close()
    
    if not sessions:
        return jsonify({'query': query, 'results': [], 'count': 0}), 200
    
    # Import and use Trie
    from data_structures import Trie
    
    # Build Trie with tool names
    trie = Trie()
    for session in sessions:
        trie.insert(session['tool_name'], {
            'session_id': session['session_id'],
            'start_time': str(session['start_time']),
            'query_count': session['query_count'],
            'duration': session['session_duration']
        })
    
    # Search using Trie
    results = trie.search_prefix(query)
    
    return jsonify({
        'query': query,
        'results': results,
        'count': len(results)
    }), 200


# ===== TIME RANGE QUERY USING BST =====

@app.route('/api/sessions/range', methods=['GET'])
def get_sessions_by_range():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload['user_id']
    except:
        return jsonify({'error': 'Invalid token'}), 401
    
    # Get time range parameters
    range_type = request.args.get('range', 'today')  # today, yesterday, week, month
    
    conn = get_db()
    cur = conn.cursor()
    
    # Calculate date range based on type
    today = datetime.date.today()
    
    if range_type == 'today':
        start_date = datetime.datetime.combine(today, datetime.time.min)
        end_date = datetime.datetime.combine(today, datetime.time.max)
    elif range_type == 'yesterday':
        yesterday = today - datetime.timedelta(days=1)
        start_date = datetime.datetime.combine(yesterday, datetime.time.min)
        end_date = datetime.datetime.combine(yesterday, datetime.time.max)
    elif range_type == 'week':
        start_date = datetime.datetime.combine(today - datetime.timedelta(days=7), datetime.time.min)
        end_date = datetime.datetime.combine(today, datetime.time.max)
    elif range_type == 'month':
        start_date = datetime.datetime.combine(today - datetime.timedelta(days=30), datetime.time.min)
        end_date = datetime.datetime.combine(today, datetime.time.max)
    else:
        return jsonify({'error': 'Invalid range type'}), 400
    
    # Get all user sessions
    cur.execute("""
        SELECT s.session_id, s.start_time, s.end_time, s.query_count, s.session_duration,
               t.tool_name
        FROM sessions s
        JOIN ai_tools t ON s.tool_id = t.tool_id
        WHERE s.user_id = %s
        ORDER BY s.start_time
    """, (user_id,))
    
    sessions = cur.fetchall()
    cur.close()
    conn.close()
    
    if not sessions:
        return jsonify({'range': range_type, 'sessions': [], 'count': 0}), 200
    
    # Import and use BST
    from data_structures import BST
    
    # Build BST with sessions
    bst = BST()
    for session in sessions:
        bst.insert(session['start_time'], {
            'session_id': session['session_id'],
            'tool_name': session['tool_name'],
            'start_time': session['start_time'],
            'end_time': session['end_time'],
            'query_count': session['query_count'],
            'duration': session['session_duration']
        })
    
    # Range query using BST
    results = bst.range_query(start_date, end_date)
    
    # Format results
    formatted_results = []
    for result in results:
        formatted_results.append({
            'session_id': result['session_id'],
            'tool_name': result['tool_name'],
            'start_time': str(result['start_time']),
            'end_time': str(result['end_time']),
            'query_count': result['query_count'],
            'duration': result['duration']
        })
    
    return jsonify({
        'range': range_type,
        'start_date': str(start_date),
        'end_date': str(end_date),
        'sessions': formatted_results,
        'count': len(formatted_results)
    }), 200

# ===== WORK PERIODS USING UNION-FIND =====

@app.route('/api/work-periods', methods=['GET'])
def get_work_periods():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload['user_id']
    except:
        return jsonify({'error': 'Invalid token'}), 401
    
    # Get date parameter (default to today)
    date_param = request.args.get('date', 'today')
    
    today = datetime.date.today()
    if date_param == 'today':
        target_date = today
    elif date_param == 'yesterday':
        target_date = today - datetime.timedelta(days=1)
    else:
        target_date = today
    
    conn = get_db()
    cur = conn.cursor()
    
    # Get all sessions for the target date
    cur.execute("""
        SELECT s.session_id, s.start_time, s.end_time, s.query_count, s.session_duration,
               t.tool_name
        FROM sessions s
        JOIN ai_tools t ON s.tool_id = t.tool_id
        WHERE s.user_id = %s AND DATE(s.start_time) = %s
        ORDER BY s.start_time
    """, (user_id, target_date))
    
    sessions = cur.fetchall()
    cur.close()
    conn.close()
    
    if not sessions:
        return jsonify({'date': str(target_date), 'work_periods': [], 'count': 0}), 200
    
    # Convert to list of dicts for Union-Find
    session_list = []
    for session in sessions:
        session_list.append({
            'session_id': session['session_id'],
            'tool_name': session['tool_name'],
            'start_time': session['start_time'],
            'end_time': session['end_time'],
            'query_count': session['query_count'],
            'duration': session['session_duration']
        })
    
    # Import and use Union-Find
    from data_structures import UnionFind
    
    uf = UnionFind(len(session_list))
    work_periods_dict = uf.group_sessions_by_time(session_list, time_threshold=900)  # 15 minutes
    
    # Format work periods for frontend
    work_periods = []
    for root, period_sessions in work_periods_dict.items():
        total_queries = sum(s['query_count'] for s in period_sessions)
        total_duration = sum(s['duration'] for s in period_sessions)
        tools_used = list(set(s['tool_name'] for s in period_sessions))
        
        work_periods.append({
            'period_id': root,
            'start_time': str(period_sessions[0]['start_time']),
            'end_time': str(period_sessions[-1]['end_time']),
            'total_queries': total_queries,
            'total_duration': total_duration,
            'session_count': len(period_sessions),
            'tools_used': tools_used,
            'sessions': [
                {
                    'tool_name': s['tool_name'],
                    'start_time': str(s['start_time']),
                    'query_count': s['query_count'],
                    'duration': s['duration']
                }
                for s in period_sessions
            ]
        })
    
    # Sort by start time
    work_periods.sort(key=lambda x: x['start_time'])
    
    return jsonify({
        'date': str(target_date),
        'work_periods': work_periods,
        'count': len(work_periods)
    }), 200


# ===== GRAPH DATA =====

@app.route('/api/graph-data', methods=['GET'])
def get_graph_data():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload['user_id']
    except:
        return jsonify({'error': 'Invalid token'}), 401
    
    view_type = request.args.get('view', 'daily')  # 'daily' or 'weekly'
    
    conn = get_db()
    cur = conn.cursor()
    
    if view_type == 'daily':
        # Last 7 days, grouped by day
        cur.execute("""
            SELECT DATE(start_time) as date,
                   SUM(query_count) as total_queries
            FROM sessions
            WHERE user_id = %s
            AND start_time >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY DATE(start_time)
            ORDER BY date
        """, (user_id,))
    else:  # weekly
        # Last 4 weeks, grouped by week
        cur.execute("""
            SELECT DATE_TRUNC('week', start_time) as week_start,
                   SUM(query_count) as total_queries
            FROM sessions
            WHERE user_id = %s
            AND start_time >= CURRENT_DATE - INTERVAL '27 days'
            GROUP BY DATE_TRUNC('week', start_time)
            ORDER BY week_start
        """, (user_id,))
    
    results = cur.fetchall()
    cur.close()
    conn.close()
    
    # Format data for chart
    labels = []
    data = []
    
    if view_type == 'daily':
        # Ensure we have all 7 days (fill missing days with 0)
        today = datetime.date.today()
        for i in range(6, -1, -1):
            date = today - datetime.timedelta(days=i)
            labels.append(date.strftime('%a %m/%d'))  # e.g., "Mon 11/17"
            
            # Find matching data
            found = False
            for row in results:
                if row['date'] == date:
                    data.append(row['total_queries'])
                    found = True
                    break
            if not found:
                data.append(0)
    else:  # weekly
        for row in results:
            week_start = row['week_start'].date() if hasattr(row['week_start'], 'date') else row['week_start']
            labels.append(f"Week of {week_start.strftime('%m/%d')}")
            data.append(row['total_queries'])
    
    return jsonify({
        'labels': labels,
        'data': data,
        'view': view_type
    }), 200

# ===== TEST ENDPOINT =====
@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({'message': 'Backend is working!'}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)