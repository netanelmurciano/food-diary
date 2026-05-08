# 📂 Project Structure Map

Detailed breakdown of the files and folders in the Food Diary project.

## 🌳 Root Directory
- `index.js`: The heart of the server. Contains all API endpoints, including the Gemini AI integration.
- `db.js`: Database configuration. Defines the schema for `diary_entries`, `favorites`, and `water_log`.
- `food-diary.db`: The SQLite database storage.
- `package.json`: Server-side dependencies and scripts.
- `README.md`: Project overview and setup instructions.
- `RULES.md`: Development standards and guidelines.

## 💻 Client Directory (`/client`)
The React frontend built with Vite.
- `index.html`: Main entry point for the browser.
- `src/`:
  - `App.jsx`: The main React component managing the state and UI.
  - `index.css`: Global styles (Vanilla CSS).
  - `main.jsx`: React mounting point.
- `public/`: Static assets.
- `vite.config.js`: Vite configuration for building and serving the frontend.

## 🧠 Key Logic Flows
1. **AI Parsing**:
   - Client sends text/image to `/api/ai/parse-text` or `/api/ai/parse-image`.
   - Server calls Gemini API, parses JSON, and saves to SQLite.
2. **Data Tracking**:
   - All nutritional data is aggregated on the fly in the weekly stats endpoint.
3. **Database**:
   - Uses `better-sqlite3` for synchronous, high-performance local database operations.
