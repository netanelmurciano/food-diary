const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'food-diary.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS diary_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    food_name TEXT NOT NULL,
    quantity_grams REAL NOT NULL,
    calories REAL NOT NULL,
    protein REAL,
    carbs REAL,
    fat REAL,
    meal_type TEXT DEFAULT 'נשנושים',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_name TEXT NOT NULL,
    quantity_grams REAL NOT NULL,
    calories REAL NOT NULL,
    protein REAL,
    carbs REAL,
    fat REAL
  );

  CREATE TABLE IF NOT EXISTS water_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    amount_ml INTEGER NOT NULL DEFAULT 0
  );
`);

// Migration to add meal_type to diary_entries if not already there
try {
  db.exec("ALTER TABLE diary_entries ADD COLUMN meal_type TEXT DEFAULT 'נשנושים'");
} catch (err) {
  // Column already exists, ignore
}

module.exports = db;
