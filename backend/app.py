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

    stats = {
        'queries_today': result['total_queries'],
        'duration_today': result['total_duration']
    }

    cur.close()
    conn.close()

    return jsonify(stats), 200


# ===== TEST ENDPOINT =====
@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({'message': 'Backend is working!'}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)
