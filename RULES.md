# 📜 Project Rules & Guidelines

These rules should be followed by all developers and AI assistants working on this project.

## 🏗 Tech Stack
- **Backend**: Express.js using CommonJS (`require`).
- **Frontend**: React (Vite) using ES Modules.
- **Database**: `better-sqlite3`. Do NOT use asynchronous drivers like `sqlite3`.
- **Styling**: Use **Vanilla CSS**. Avoid adding Tailwind or complex CSS frameworks unless explicitly requested.

## 🤖 AI Integration (Gemini)
- Always use the `responseMimeType: 'application/json'` configuration.
- Prompts must explicitly request a raw JSON array without markdown formatting.
- Ensure Hebrew support for food names.
- Keep timeouts generous (30s for text, 45s for images).
- Do not do any changes in the AI-related code unless explicitly requested by me.
- When i am writing in hebrew, you should respond in hebrew when i am writing in english, respond in english.

## 💾 Database Practices
- Use prepared statements for all queries (`db.prepare().run/get/all`).
- Keep the database schema updated in a centralized location (currently `db.js`).
- Store nutritional values (calories, protein, etc.) as numbers.

## 🎨 UI/UX Standards
- The design should feel premium and clean.
- Use smooth transitions for adding/deleting entries.
- Ensure RTL (Right-to-Left) support is handled correctly for Hebrew text.

## 🛠 Workflow
- Always verify changes in the `client/src` directory for frontend updates.
- Server logic resides primarily in the root `index.js`.
