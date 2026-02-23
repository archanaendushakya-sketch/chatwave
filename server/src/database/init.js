import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;
let dbPath = null;

/**
 * Initialize the SQLite database with schema.
 * Uses sql.js — a pure JavaScript implementation of SQLite.
 * No native build tools required.
 */
export async function initDatabase(customPath) {
    dbPath = customPath || path.join(__dirname, '..', '..', 'data', 'chatwave.db');
    const dir = path.dirname(dbPath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const SQL = await initSqlJs();

    // Load existing database or create new
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    createTables();
    createIndexes();
    saveDatabase();

    return db;
}

function createTables() {
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT DEFAULT 'New Trip Planning',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS stations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT,
      type TEXT NOT NULL CHECK (type IN ('bus', 'train', 'both')),
      latitude REAL,
      longitude REAL,
      code TEXT UNIQUE
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS routes (
      id TEXT PRIMARY KEY,
      origin_id TEXT NOT NULL,
      destination_id TEXT NOT NULL,
      mode TEXT NOT NULL CHECK (mode IN ('bus', 'train')),
      operator TEXT NOT NULL,
      route_name TEXT NOT NULL,
      base_price REAL NOT NULL,
      duration_minutes INTEGER NOT NULL,
      distance_km REAL,
      frequency TEXT DEFAULT 'daily',
      FOREIGN KEY (origin_id) REFERENCES stations(id),
      FOREIGN KEY (destination_id) REFERENCES stations(id)
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      route_id TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      arrival_time TEXT NOT NULL,
      days_of_week TEXT DEFAULT '0,1,2,3,4,5,6',
      is_active INTEGER DEFAULT 1,
      platform TEXT,
      FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS routes_cache (
      id TEXT PRIMARY KEY,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      mode TEXT,
      date TEXT,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      preferred_mode TEXT DEFAULT 'any',
      budget_preference TEXT DEFAULT 'balanced',
      seat_class TEXT DEFAULT 'standard',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

function createIndexes() {
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)',
        'CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_routes_origin ON routes(origin_id)',
        'CREATE INDEX IF NOT EXISTS idx_routes_destination ON routes(destination_id)',
        'CREATE INDEX IF NOT EXISTS idx_routes_mode ON routes(mode)',
        'CREATE INDEX IF NOT EXISTS idx_schedules_route ON schedules(route_id)',
        'CREATE INDEX IF NOT EXISTS idx_stations_city ON stations(city)',
        'CREATE INDEX IF NOT EXISTS idx_stations_name ON stations(name)',
        'CREATE INDEX IF NOT EXISTS idx_routes_cache_lookup ON routes_cache(origin, destination, mode)',
    ];

    for (const idx of indexes) {
        db.run(idx);
    }
}

/**
 * Save the in-memory database to disk.
 */
export function saveDatabase() {
    if (db && dbPath) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

/**
 * Get the database instance.
 */
export function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

/**
 * Helper: Run a query and return all matching rows as an array of objects.
 * sql.js returns results differently from better-sqlite3, so this normalizes the API.
 */
export function queryAll(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);

    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

/**
 * Helper: Run a query and return the first matching row.
 */
export function queryOne(sql, params = []) {
    const results = queryAll(sql, params);
    return results.length > 0 ? results[0] : null;
}

/**
 * Helper: Run an INSERT/UPDATE/DELETE statement.
 */
export function runSql(sql, params = []) {
    db.run(sql, params);
    saveDatabase(); // Persist changes
}

export function closeDatabase() {
    if (db) {
        saveDatabase();
        db.close();
        db = null;
    }
}
