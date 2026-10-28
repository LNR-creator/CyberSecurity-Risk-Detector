import json
import sqlite3
import os
import uuid
import logging
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from config import Config

logger = logging.getLogger(__name__)

class SQLiteCollection:
    """
    Lightweight SQLite-backed document collection adapter mimicking essential PyMongo API
    for local development mode when MongoDB is not running.
    """
    def __init__(self, db_path, collection_name):
        self.db_path = db_path
        self.name = collection_name
        self._init_table()

    def _get_conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_table(self):
        with self._get_conn() as conn:
            conn.execute(f"""
                CREATE TABLE IF NOT EXISTS {self.name} (
                    id TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def _matches(self, doc, query):
        if not query:
            return True
        for key, val in query.items():
            if key == '_id':
                if str(doc.get('_id')) != str(val):
                    return False
            elif isinstance(val, dict):
                # Simple operator support: $in, $gte, $lte, $ne
                doc_val = doc.get(key)
                if '$in' in val and doc_val not in val['$in']:
                    return False
                if '$gte' in val and (doc_val is None or doc_val < val['$gte']):
                    return False
                if '$lte' in val and (doc_val is None or doc_val > val['$lte']):
                    return False
                if '$ne' in val and doc_val == val['$ne']:
                    return False
            else:
                if doc.get(key) != val:
                    return False
        return True

    def find_one(self, query=None):
        query = query or {}
        with self._get_conn() as conn:
            cursor = conn.execute(f"SELECT data FROM {self.name}")
            for row in cursor.fetchall():
                doc = json.loads(row['data'])
                if self._matches(doc, query):
                    return doc
        return None

    def find(self, query=None, sort=None, limit=None, skip=None):
        query = query or {}
        results = []
        with self._get_conn() as conn:
            cursor = conn.execute(f"SELECT data FROM {self.name}")
            for row in cursor.fetchall():
                doc = json.loads(row['data'])
                if self._matches(doc, query):
                    results.append(doc)
        
        if sort:
            # sort: list of (field, direction: 1 or -1)
            for field, direction in reversed(sort):
                reverse = (direction == -1)
                results.sort(key=lambda d: (d.get(field) is None, d.get(field)), reverse=reverse)

        if skip:
            results = results[skip:]
        if limit:
            results = results[:limit]

        return results

    def insert_one(self, doc):
        doc = dict(doc)
        if '_id' not in doc:
            doc['_id'] = str(uuid.uuid4())
        else:
            doc['_id'] = str(doc['_id'])
        
        with self._get_conn() as conn:
            conn.execute(
                f"INSERT OR REPLACE INTO {self.name} (id, data) VALUES (?, ?)",
                (doc['_id'], json.dumps(doc, default=str))
            )
            conn.commit()

        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        return InsertResult(doc['_id'])

    def insert_many(self, docs):
        inserted_ids = []
        with self._get_conn() as conn:
            for doc in docs:
                doc = dict(doc)
                if '_id' not in doc:
                    doc['_id'] = str(uuid.uuid4())
                else:
                    doc['_id'] = str(doc['_id'])
                conn.execute(
                    f"INSERT OR REPLACE INTO {self.name} (id, data) VALUES (?, ?)",
                    (doc['_id'], json.dumps(doc, default=str))
                )
                inserted_ids.append(doc['_id'])
            conn.commit()
        return inserted_ids

    def update_one(self, query, update):
        target = self.find_one(query)
        if not target:
            class UpdateResult:
                modified_count = 0
            return UpdateResult()

        if '$set' in update:
            target.update(update['$set'])
        else:
            target.update(update)

        with self._get_conn() as conn:
            conn.execute(
                f"UPDATE {self.name} SET data = ? WHERE id = ?",
                (json.dumps(target, default=str), str(target['_id']))
            )
            conn.commit()

        class UpdateResult:
            modified_count = 1
        return UpdateResult()

    def count_documents(self, query=None):
        return len(self.find(query or {}))

    def delete_one(self, query):
        target = self.find_one(query)
        if not target:
            return 0
        with self._get_conn() as conn:
            conn.execute(f"DELETE FROM {self.name} WHERE id = ?", (str(target['_id']),))
            conn.commit()
        return 1

    def distinct(self, field, query=None):
        docs = self.find(query or {})
        values = set()
        for doc in docs:
            val = doc.get(field)
            if val is not None:
                values.add(val)
        return list(values)


class MongoCollectionWrapper:
    def __init__(self, collection):
        self._col = collection

    def __getattr__(self, name):
        return getattr(self._col, name)

    def _convert_id(self, doc):
        if doc and '_id' in doc:
            doc['_id'] = str(doc['_id'])
        return doc

    def find_one(self, *args, **kwargs):
        doc = self._col.find_one(*args, **kwargs)
        return self._convert_id(doc)

    def find(self, *args, **kwargs):
        # Handle sort, limit, skip if passed as args/kwargs or return wrapper
        sort = kwargs.pop('sort', None)
        limit = kwargs.pop('limit', None)
        skip = kwargs.pop('skip', None)
        
        cursor = self._col.find(*args, **kwargs)
        if sort:
            cursor = cursor.sort(sort)
        if skip:
            cursor = cursor.skip(skip)
        if limit:
            cursor = cursor.limit(limit)

        docs = []
        for d in cursor:
            docs.append(self._convert_id(d))
        return docs

    def update_one(self, query, update, *args, **kwargs):
        if isinstance(update, dict) and not any(k.startswith('$') for k in update.keys()):
            update = {"$set": update}
        return self._col.update_one(query, update, *args, **kwargs)

    def count_documents(self, *args, **kwargs):
        return self._col.count_documents(*args, **kwargs)

    def insert_one(self, *args, **kwargs):
        return self._col.insert_one(*args, **kwargs)

    def insert_many(self, *args, **kwargs):
        return self._col.insert_many(*args, **kwargs)

    def delete_one(self, *args, **kwargs):
        return self._col.delete_one(*args, **kwargs)

    def distinct(self, *args, **kwargs):
        return self._col.distinct(*args, **kwargs)


class DatabaseManager:
    def __init__(self):
        self.engine = 'unknown'
        self.client = None
        self.db = None
        self._collections = {}
        self.init_db()

    def init_db(self):
        # 1. Attempt MongoDB connection
        try:
            self.client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=2000)
            self.client.admin.command('ping')
            self.db = self.client[Config.DB_NAME]
            self.engine = 'mongodb'
            logger.info("Database: Connected to MongoDB successfully.")
            self._ensure_mongo_indexes()
            return
        except (ConnectionFailure, ServerSelectionTimeoutError, Exception) as e:
            logger.warning(f"Database: MongoDB not reachable ({e}). Falling back to local SQLite.")

        # 2. Fallback to SQLite document store
        self.engine = 'sqlite'
        os.makedirs(os.path.dirname(Config.SQLITE_PATH), exist_ok=True)
        self.db_path = Config.SQLITE_PATH
        logger.info(f"Database: Local SQLite active at {self.db_path}")

    def _ensure_mongo_indexes(self):
        try:
            self.db.users.create_index("username", unique=True)
            self.db.users.create_index("email", unique=True)
            self.db.analyses.create_index("user_id")
            self.db.analyses.create_index("created_at")
            self.db.alerts.create_index("analysis_id")
            self.db.alerts.create_index("user_id")
            self.db.alerts.create_index("severity")
            self.db.alerts.create_index("investigation_status")
            self.db.reports.create_index("user_id")
        except Exception as e:
            logger.warning(f"Failed to create some MongoDB indexes: {e}")

    def get_collection(self, name):
        if self.engine == 'mongodb':
            if name not in self._collections:
                self._collections[name] = MongoCollectionWrapper(self.db[name])
            return self._collections[name]
        else:
            if name not in self._collections:
                self._collections[name] = SQLiteCollection(self.db_path, name)
            return self._collections[name]


    @property
    def users(self):
        return self.get_collection('users')

    @property
    def analyses(self):
        return self.get_collection('analyses')

    @property
    def alerts(self):
        return self.get_collection('alerts')

    @property
    def reports(self):
        return self.get_collection('reports')

    @property
    def settings(self):
        return self.get_collection('settings')

    def get_status(self):
        return {
            "engine": self.engine,
            "connected": True,
            "details": f"Active backend: {self.engine.upper()} (URI: {Config.MONGO_URI if self.engine == 'mongodb' else Config.SQLITE_PATH})"
        }

db_manager = DatabaseManager()
