# Trie--------------------------------------------------------------------------------
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end_of_word = False
        self.data = []  # Store session IDs or tool info

class Trie:
    def __init__(self):
        self.root = TrieNode()
    
    def insert(self, word, data=None):
        """Insert a word into the trie with optional associated data"""
        node = self.root
        for char in word.lower():
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end_of_word = True
        if data:
            node.data.append(data)
    
    def search(self, word):
        """Search for exact word match"""
        node = self.root
        for char in word.lower():
            if char not in node.children:
                return False
            node = node.children[char]
        return node.is_end_of_word
    
    def search_prefix(self, prefix):
        """Find all words with given prefix"""
        node = self.root
        for char in prefix.lower():
            if char not in node.children:
                return []
            node = node.children[char]
        
        # Collect all words from this point
        results = []
        self._collect_words(node, prefix.lower(), results)
        return results
    
    def _collect_words(self, node, prefix, results):
        """Helper to collect all words from a node"""
        if node.is_end_of_word:
            results.append({'word': prefix, 'data': node.data})
        
        for char, child in node.children.items():
            self._collect_words(child, prefix + char, results)
    
    def get_data(self, word):
        """Get all data associated with a word"""
        node = self.root
        for char in word.lower():
            if char not in node.children:
                return []
            node = node.children[char]
        return node.data if node.is_end_of_word else []
    


# BST--------------------------------------------------------------------------------

class BSTNode:
    def __init__(self, timestamp, session_data):
        self.timestamp = timestamp
        self.session_data = session_data
        self.left = None
        self.right = None
        self.height = 1  # For AVL balancing

class BST:
    def __init__(self):
        self.root = None
    
    def insert(self, timestamp, session_data):
        """Insert a session into the BST sorted by timestamp"""
        self.root = self._insert_recursive(self.root, timestamp, session_data)
    
    def _insert_recursive(self, node, timestamp, session_data):
        # Standard BST insertion
        if not node:
            return BSTNode(timestamp, session_data)
        
        if timestamp < node.timestamp:
            node.left = self._insert_recursive(node.left, timestamp, session_data)
        else:
            node.right = self._insert_recursive(node.right, timestamp, session_data)
        
        # Update height
        node.height = 1 + max(self._get_height(node.left), 
                             self._get_height(node.right))
        
        # AVL balancing
        balance = self._get_balance(node)
        
        # Left Left Case
        if balance > 1 and timestamp < node.left.timestamp:
            return self._rotate_right(node)
        
        # Right Right Case
        if balance < -1 and timestamp > node.right.timestamp:
            return self._rotate_left(node)
        
        # Left Right Case
        if balance > 1 and timestamp > node.left.timestamp:
            node.left = self._rotate_left(node.left)
            return self._rotate_right(node)
        
        # Right Left Case
        if balance < -1 and timestamp < node.right.timestamp:
            node.right = self._rotate_right(node.right)
            return self._rotate_left(node)
        
        return node
    
    def _get_height(self, node):
        if not node:
            return 0
        return node.height
    
    def _get_balance(self, node):
        if not node:
            return 0
        return self._get_height(node.left) - self._get_height(node.right)
    
    def _rotate_left(self, z):
        y = z.right
        T2 = y.left
        
        y.left = z
        z.right = T2
        
        z.height = 1 + max(self._get_height(z.left), self._get_height(z.right))
        y.height = 1 + max(self._get_height(y.left), self._get_height(y.right))
        
        return y
    
    def _rotate_right(self, z):
        y = z.left
        T3 = y.right
        
        y.right = z
        z.left = T3
        
        z.height = 1 + max(self._get_height(z.left), self._get_height(z.right))
        y.height = 1 + max(self._get_height(y.left), self._get_height(y.right))
        
        return y
    
    def range_query(self, start_time, end_time):
        """Find all sessions between start_time and end_time"""
        results = []
        self._range_search(self.root, start_time, end_time, results)
        return results
    
    def _range_search(self, node, start, end, results):
        if not node:
            return
        
        # If current node is in range, add it
        if start <= node.timestamp <= end:
            results.append(node.session_data)
        
        # Recursively search left and right
        if node.timestamp > start:
            self._range_search(node.left, start, end, results)
        if node.timestamp < end:
            self._range_search(node.right, start, end, results)


# Union Find--------------------------------------------------------------------------------

class UnionFind:
    def __init__(self, size):
        self.parent = list(range(size))
        self.rank = [0] * size
        self.groups = {}  # Maps parent to list of session indices
    
    def find(self, x):
        """Find the root parent of x with path compression"""
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # Path compression
        return self.parent[x]
    
    def union(self, x, y):
        """Union two sets by rank"""
        root_x = self.find(x)
        root_y = self.find(y)
        
        if root_x != root_y:
            # Union by rank
            if self.rank[root_x] < self.rank[root_y]:
                self.parent[root_x] = root_y
            elif self.rank[root_x] > self.rank[root_y]:
                self.parent[root_y] = root_x
            else:
                self.parent[root_y] = root_x
                self.rank[root_x] += 1
    
    def group_sessions_by_time(self, sessions, time_threshold=900):
        """
        Group sessions into work periods based on time proximity
        time_threshold in seconds (default 15 minutes = 900s)
        Returns: dict mapping work period ID to list of sessions
        """
        if not sessions:
            return {}
        
        # Sort sessions by start time
        sorted_sessions = sorted(enumerate(sessions), 
                                key=lambda x: x[1]['start_time'])
        
        # Union sessions that are close in time
        for i in range(len(sorted_sessions) - 1):
            curr_idx, curr_session = sorted_sessions[i]
            next_idx, next_session = sorted_sessions[i + 1]
            
            time_diff = (next_session['start_time'] - 
                        curr_session['start_time']).total_seconds()
            
            if time_diff <= time_threshold:
                self.union(curr_idx, next_idx)
        
        # Group sessions by their root parent
        work_periods = {}
        for idx, session in enumerate(sessions):
            root = self.find(idx)
            if root not in work_periods:
                work_periods[root] = []
            work_periods[root].append(session)
        
        return work_periods
    
    def count_work_periods(self):
        """Count the number of distinct work periods"""
        unique_roots = set(self.find(i) for i in range(len(self.parent)))
        return len(unique_roots)