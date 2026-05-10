const Database = require('better-sqlite3');
const path = require('path');

let dbPath = path.join(__dirname, 'food-diary.db');
// If we're on the production server, store the DB one folder above the git repo so it doesn't get overwritten on redeploy
if (process.env.NODE_ENV === 'production' || !__dirname.includes('Users')) {
  dbPath = path.join(__dirname, '../food-diary.db');
}

const db = new Database(dbPath);

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

  CREATE TABLE IF NOT EXISTS weight_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    fat_pct REAL,
    muscle_mass_kg REAL,
    water_pct REAL,
    bone_mass_kg REAL,
    visceral_fat REAL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    steps INTEGER DEFAULT 0,
    burned_calories INTEGER DEFAULT 0,
    active_minutes INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    height_cm REAL,
    target_weight_kg REAL,
    starting_weight_kg REAL,
    google_refresh_token TEXT,
    google_access_token TEXT
  );
`);

// Migration to add meal_type to diary_entries if not already there
try {
  db.exec("ALTER TABLE diary_entries ADD COLUMN meal_type TEXT DEFAULT 'נשנושים'");
} catch (err) {}

// Migrations for weight_log new columns
const weightCols = ['fat_pct', 'muscle_mass_kg', 'water_pct', 'bone_mass_kg', 'visceral_fat'];
weightCols.forEach(col => {
  try {
    db.exec(`ALTER TABLE weight_log ADD COLUMN ${col} REAL`);
  } catch (err) {}
});

// Migrations for user_settings google tokens
try {
  db.exec("ALTER TABLE user_settings ADD COLUMN google_refresh_token TEXT");
} catch (err) {}
try {
  db.exec("ALTER TABLE user_settings ADD COLUMN google_access_token TEXT");
} catch (err) {}

module.exports = db;
