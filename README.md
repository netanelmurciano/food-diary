# 🥗 Food Diary & AI Nutrition Tracker

A full-stack application to track daily food intake, water consumption, and nutritional statistics with AI-powered features.

## 🚀 Features
- **AI Text Parsing**: Log your meals using free text (e.g., "אכלתי סלט חסה עם עוף בצהריים").
- **AI Image Analysis**: Upload a photo of your plate, and the AI will estimate the ingredients and nutritional values.
- **Water Tracker**: Log daily water intake.
- **Favorites**: Save frequent food items for quick logging.
- **Weekly Stats**: Visualize your nutritional progress over the last 7 days.

## 🛠 Tech Stack
- **Frontend**: React + Vite (located in `/client`)
- **Backend**: Node.js + Express
- **Database**: SQLite (via `better-sqlite3`)
- **AI**: Google Gemini API (Flash model)
- **Styling**: Vanilla CSS

## ⚙️ Setup & Installation

1. **Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_api_key_here
   PORT=3001
   ```

2. **Install Dependencies**:
   ```bash
   # Root (Server)
   npm install

   # Client
   cd client
   npm install
   ```

3. **Run the Project**:
   ```bash
   # Development (Run server and client separately)
   npm start # Starts server on port 3001
   cd client && npm run dev # Starts Vite on port 5173
   ```

## 📂 Project Structure
- `/client`: Frontend source code and assets.
- `/server`: (Note: Root serves as the server base in this setup).
- `index.js`: Server entry point and API endpoints.
- `db.js`: Database initialization and schema.
- `food-diary.db`: SQLite database file.
