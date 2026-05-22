import aiosqlite
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "medieval.db")


async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
            PRAGMA journal_mode=WAL;

            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                last_seen TEXT DEFAULT (datetime('now')),
                map_x INTEGER DEFAULT 0,
                map_y INTEGER DEFAULT 0,
                castle_name TEXT DEFAULT 'Мой замок',
                score INTEGER DEFAULT 0,
                alliance_id INTEGER DEFAULT NULL
            );

            CREATE TABLE IF NOT EXISTS resources (
                player_id INTEGER PRIMARY KEY,
                gold REAL DEFAULT 500,
                food REAL DEFAULT 300,
                wood REAL DEFAULT 300,
                stone REAL DEFAULT 200,
                last_tick TEXT DEFAULT (datetime('now')),
                FOREIGN KEY(player_id) REFERENCES players(id)
            );

            CREATE TABLE IF NOT EXISTS buildings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                building_type TEXT NOT NULL,
                level INTEGER DEFAULT 1,
                hp INTEGER DEFAULT 1000,
                max_hp INTEGER DEFAULT 1000,
                upgrade_finish TEXT DEFAULT NULL,
                pos_x INTEGER DEFAULT 0,
                pos_y INTEGER DEFAULT 0,
                FOREIGN KEY(player_id) REFERENCES players(id)
            );

            CREATE TABLE IF NOT EXISTS units (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                unit_type TEXT NOT NULL,
                count INTEGER DEFAULT 0,
                FOREIGN KEY(player_id) REFERENCES players(id),
                UNIQUE(player_id, unit_type)
            );

            CREATE TABLE IF NOT EXISTS training_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                unit_type TEXT NOT NULL,
                count INTEGER NOT NULL,
                finish_time TEXT NOT NULL,
                FOREIGN KEY(player_id) REFERENCES players(id)
            );

            CREATE TABLE IF NOT EXISTS research (
                player_id INTEGER NOT NULL,
                tech_id TEXT NOT NULL,
                status TEXT DEFAULT 'available',
                finish_time TEXT DEFAULT NULL,
                PRIMARY KEY(player_id, tech_id),
                FOREIGN KEY(player_id) REFERENCES players(id)
            );

            CREATE TABLE IF NOT EXISTS attacks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                attacker_id INTEGER NOT NULL,
                defender_id INTEGER NOT NULL,
                units_sent TEXT NOT NULL,
                depart_time TEXT DEFAULT (datetime('now')),
                arrive_time TEXT NOT NULL,
                return_time TEXT DEFAULT NULL,
                status TEXT DEFAULT 'traveling',
                result TEXT DEFAULT NULL,
                loot TEXT DEFAULT NULL,
                FOREIGN KEY(attacker_id) REFERENCES players(id),
                FOREIGN KEY(defender_id) REFERENCES players(id)
            );

            CREATE TABLE IF NOT EXISTS alliances (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                tag TEXT UNIQUE NOT NULL,
                leader_id INTEGER NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                description TEXT DEFAULT '',
                FOREIGN KEY(leader_id) REFERENCES players(id)
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER DEFAULT NULL,
                alliance_id INTEGER DEFAULT NULL,
                content TEXT NOT NULL,
                sent_at TEXT DEFAULT (datetime('now')),
                is_read INTEGER DEFAULT 0,
                FOREIGN KEY(sender_id) REFERENCES players(id)
            );

            CREATE TABLE IF NOT EXISTS map_tiles (
                x INTEGER NOT NULL,
                y INTEGER NOT NULL,
                tile_type TEXT DEFAULT 'grass',
                resource_type TEXT DEFAULT NULL,
                resource_amount INTEGER DEFAULT 0,
                owner_id INTEGER DEFAULT NULL,
                PRIMARY KEY(x, y)
            );
        """)
        await db.commit()
