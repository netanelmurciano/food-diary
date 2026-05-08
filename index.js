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
Do not include any explanation or markdown formatting like \`\`\`json. Just the raw JSON array.
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      },
      { timeout: 30000 } // Increased timeout to 30s
    );

    let aiResponse = response.data.candidates[0].content.parts[0].text;
    
    // Safety check: remove markdown code blocks if the AI included them anyway
    if (aiResponse.includes('```')) {
      aiResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    let items;
    try {
      items = JSON.parse(aiResponse);
    } catch (parseErr) {
      console.error('Failed to parse AI JSON response:', aiResponse);
      throw new Error('Invalid JSON format from AI');
    }

    if (!Array.isArray(items)) {
      console.error('AI response is not an array:', items);
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
    console.error('Error in parse-text:', err.response?.data || err.message);
    const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to parse text via AI';
    res.status(500).json({ error: errorMessage });
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
Do not include any explanation or markdown formatting like \`\`\`json. Just the raw JSON array.
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
        generationConfig: { 
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      },
      { timeout: 45000 } // Increased timeout for images to 45s
    );

    let aiResponse = response.data.candidates[0].content.parts[0].text;
    
    // Safety check: remove markdown code blocks if the AI included them anyway
    if (aiResponse.includes('```')) {
      aiResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    let items;
    try {
      items = JSON.parse(aiResponse);
    } catch (parseErr) {
      console.error('Failed to parse AI JSON response (image):', aiResponse);
      throw new Error('Invalid JSON format from AI');
    }

    if (!Array.isArray(items)) {
      console.error('AI response (image) is not an array:', items);
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
    console.error('Error in parse-image:', err.response?.data || err.message);
    const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to parse image via AI';
    res.status(500).json({ error: errorMessage });
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

// --- User Settings endpoints ---
app.get('/api/settings', (req, res) => {
  let settings = db.prepare('SELECT * FROM user_settings WHERE id = 1').get();
  if (!settings) {
    settings = { height_cm: null, target_weight_kg: null, starting_weight_kg: null };
  }
  res.json(settings);
});

app.post('/api/settings', (req, res) => {
  const { height_cm, target_weight_kg, starting_weight_kg } = req.body;
  const existing = db.prepare('SELECT id FROM user_settings WHERE id = 1').get();
  
  if (existing) {
    db.prepare('UPDATE user_settings SET height_cm = ?, target_weight_kg = ?, starting_weight_kg = ? WHERE id = 1')
      .run(height_cm, target_weight_kg, starting_weight_kg);
  } else {
    db.prepare('INSERT INTO user_settings (id, height_cm, target_weight_kg, starting_weight_kg) VALUES (1, ?, ?, ?)')
      .run(height_cm, target_weight_kg, starting_weight_kg);
  }
  res.json({ success: true });
});

// --- Weight log endpoints ---
app.get('/api/weight', (req, res) => {
  const logs = db.prepare('SELECT * FROM weight_log ORDER BY date DESC').all();
  res.json(logs);
});

app.post('/api/weight', (req, res) => {
  const { date, weight_kg } = req.body;
  const existing = db.prepare('SELECT id FROM weight_log WHERE date = ?').get(date);
  if (existing) {
    db.prepare('UPDATE weight_log SET weight_kg = ? WHERE date = ?').run(weight_kg, date);
  } else {
    db.prepare('INSERT INTO weight_log (date, weight_kg) VALUES (?, ?)').run(date, weight_kg);
  }
  res.json({ success: true });
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
let distPath = path.join(__dirname, 'client/dist');
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
