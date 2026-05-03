const express = require('express');
const cors = require('cors');
const axios = require('axios');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// AI parsing for free text
app.post('/api/ai/parse-text', async (req, res) => {
  const { text, date, meal_type } = req.body;
  if (!text || !date) return res.status(400).json({ error: 'Missing text or date' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });

  try {
    const prompt = `
The user logged their food intake: "${text}".
Analyze this and extract the food items.
Assign the most appropriate meal type from: "בוקר", "ביניים", "צהריים", "ערב", "נשנושים".
Return ONLY a JSON array of objects with the exact keys: "food_name", "quantity_grams", "calories", "protein", "carbs", "fat", "meal_type".
All fields must be numbers except food_name and meal_type which are strings.
Name the foods in Hebrew.
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      },
      { timeout: 15000 }
    );

    const aiResponse = response.data.candidates[0].content.parts[0].text;
    const items = JSON.parse(aiResponse);

    if (!Array.isArray(items)) {
      return res.status(500).json({ error: 'AI returned invalid format' });
    }

    const insertedEntries = [];
    const insert = db.prepare(
      'INSERT INTO diary_entries (date, food_name, quantity_grams, calories, protein, carbs, fat, meal_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    for (const item of items) {
      const result = insert.run(
        date,
        item.food_name || 'פריט לא מזוהה',
        item.quantity_grams || 0,
        item.calories || 0,
        item.protein || 0,
        item.carbs || 0,
        item.fat || 0,
        meal_type || item.meal_type || 'נשנושים'
      );
      const entry = db.prepare('SELECT * FROM diary_entries WHERE id = ?').get(result.lastInsertRowid);
      insertedEntries.push(entry);
    }

    res.json({ success: true, entries: insertedEntries });
  } catch (err) {
    console.error('Error in parse-text:', err);
    res.status(500).json({ error: 'Failed to parse text via AI' });
  }
});

// AI parsing for uploaded food plate photo
app.post('/api/ai/parse-image', async (req, res) => {
  const { image, date, meal_type } = req.body; // base64 string
  if (!image || !date) return res.status(400).json({ error: 'Missing image or date' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });

  try {
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }

    const prompt = `
Analyze this food plate photo. Identify the food items visible in the picture.
Estimate the portions and provide the nutritional content for each item.
Assign the most appropriate meal type from: "בוקר", "ביניים", "צהריים", "ערב", "נשנושים".
Return ONLY a JSON array of objects with the exact keys: "food_name", "quantity_grams", "calories", "protein", "carbs", "fat", "meal_type".
All fields must be numbers except food_name and meal_type which are strings.
Name the foods in Hebrew.
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: { responseMimeType: 'application/json' }
      },
      { timeout: 20000 }
    );

    const aiResponse = response.data.candidates[0].content.parts[0].text;
    const items = JSON.parse(aiResponse);

    if (!Array.isArray(items)) {
      return res.status(500).json({ error: 'AI returned invalid format' });
    }

    const insertedEntries = [];
    const insert = db.prepare(
      'INSERT INTO diary_entries (date, food_name, quantity_grams, calories, protein, carbs, fat, meal_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    for (const item of items) {
      const result = insert.run(
        date,
        item.food_name || 'פריט לא מזוהה',
        item.quantity_grams || 0,
        item.calories || 0,
        item.protein || 0,
        item.carbs || 0,
        item.fat || 0,
        meal_type || item.meal_type || 'נשנושים'
      );
      const entry = db.prepare('SELECT * FROM diary_entries WHERE id = ?').get(result.lastInsertRowid);
      insertedEntries.push(entry);
    }

    res.json({ success: true, entries: insertedEntries });
  } catch (err) {
    console.error('Error in parse-image:', err);
    res.status(500).json({ error: 'Failed to parse image via AI' });
  }
});

// Get entries for a date
app.get('/api/diary/:date', (req, res) => {
  const entries = db.prepare('SELECT * FROM diary_entries WHERE date = ? ORDER BY created_at').all(req.params.date);
  res.json(entries);
});

// Add entry
app.post('/api/diary', (req, res) => {
  const { date, food_name, quantity_grams, calories, protein, carbs, fat, meal_type } = req.body;
  const result = db.prepare(
    'INSERT INTO diary_entries (date, food_name, quantity_grams, calories, protein, carbs, fat, meal_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(date, food_name, quantity_grams || 0, calories || 0, protein || 0, carbs || 0, fat || 0, meal_type || 'בוקר');
  const entry = db.prepare('SELECT * FROM diary_entries WHERE id = ?').get(result.lastInsertRowid);
  res.json(entry);
});

// Update an entry's meal type
app.patch('/api/diary/:id', (req, res) => {
  const { meal_type } = req.body;
  db.prepare('UPDATE diary_entries SET meal_type = ? WHERE id = ?').run(meal_type, req.params.id);
  const entry = db.prepare('SELECT * FROM diary_entries WHERE id = ?').get(req.params.id);
  res.json(entry);
});

// Delete entry
app.delete('/api/diary/:id', (req, res) => {
  db.prepare('DELETE FROM diary_entries WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Get favorites
app.get('/api/favorites', (req, res) => {
  const favorites = db.prepare('SELECT * FROM favorites ORDER BY id DESC').all();
  res.json(favorites);
});

// Add to favorites with fallbacks
app.post('/api/favorites', (req, res) => {
  const { food_name, quantity_grams, calories, protein, carbs, fat } = req.body;
  const result = db.prepare(
    'INSERT INTO favorites (food_name, quantity_grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    food_name || 'פריט לא מזוהה',
    quantity_grams || 0,
    calories || 0,
    protein || 0,
    carbs || 0,
    fat || 0
  );
  const fav = db.prepare('SELECT * FROM favorites WHERE id = ?').get(result.lastInsertRowid);
  res.json(fav);
});

// Delete from favorites
app.delete('/api/favorites/:id', (req, res) => {
  db.prepare('DELETE FROM favorites WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- Water tracking endpoints ---
app.get('/api/water/:date', (req, res) => {
  const log = db.prepare('SELECT amount_ml FROM water_log WHERE date = ?').get(req.params.date);
  res.json({ amount_ml: log ? log.amount_ml : 0 });
});

app.post('/api/water', (req, res) => {
  const { date, amount_ml } = req.body;
  const existing = db.prepare('SELECT amount_ml FROM water_log WHERE date = ?').get(date);
  if (existing) {
    const newAmount = Math.max(0, existing.amount_ml + amount_ml);
    db.prepare('UPDATE water_log SET amount_ml = ? WHERE date = ?').run(newAmount, date);
  } else {
    const newAmount = Math.max(0, amount_ml);
    db.prepare('INSERT INTO water_log (date, amount_ml) VALUES (?, ?)').run(date, newAmount);
  }
  const updated = db.prepare('SELECT amount_ml FROM water_log WHERE date = ?').get(date);
  res.json(updated);
});

// --- Weekly Statistics endpoint ---
app.get('/api/stats/weekly', (req, res) => {
  const stats = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const totals = db.prepare(
      'SELECT SUM(calories) as calories, SUM(protein) as protein, SUM(carbs) as carbs, SUM(fat) as fat FROM diary_entries WHERE date = ?'
    ).get(dateStr);

    stats.push({
      date: dateStr,
      calories: totals.calories || 0,
      protein: totals.protein || 0,
      carbs: totals.carbs || 0,
      fat: totals.fat || 0,
    });
  }
  res.json(stats);
});

const path = require('path');
const fs = require('fs');

// Determine the correct client build directory path
let distPath = path.join(__dirname, '../client/dist');
if (!fs.existsSync(distPath)) {
  distPath = path.join(__dirname, 'dist');
}

// Serve static files from React build directory
app.use(express.static(distPath));

// Catchall route to send React's index.html for any frontend route
app.get(/.*/, (req, res) => {
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.status(404).send('Not Found');
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
