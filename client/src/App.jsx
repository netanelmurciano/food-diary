import { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';

const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:3001/api' 
  : '/api';

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

const emptyManual = { food_name: '', calories: '', protein: '', carbs: '', fat: '', meal_type: 'בוקר' };

const initialTargets = { calories: 2000, protein: 130, carbs: 220, fat: 65 };

function App() {
  const [date, setDate] = useState(todayDate());
  const [entries, setEntries] = useState([]);
  const [mode, setMode] = useState('manual'); // 'manual' | 'text-ai' | 'image-ai' | 'favorites' | 'stats'
  const [manual, setManual] = useState(emptyManual);
  const [aiText, setAiText] = useState('');
  const [aiImage, setAiImage] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [water, setWater] = useState(0);
  const [stats, setStats] = useState([]);
  const [aiMealType, setAiMealType] = useState('בוקר');
  const [targets, setTargets] = useState(() => {
    const saved = localStorage.getItem('user_targets');
    return saved ? JSON.parse(saved) : initialTargets;
  });

  useEffect(() => {
    fetchEntries();
    fetchFavorites();
    fetchWater();
    if (mode === 'stats') {
      fetchStats();
    }
  }, [date, mode]);

  useEffect(() => {
    localStorage.setItem('user_targets', JSON.stringify(targets));
  }, [targets]);

  async function fetchEntries() {
    const { data } = await axios.get(`${API}/diary/${date}`);
    setEntries(data);
  }

  async function fetchFavorites() {
    const { data } = await axios.get(`${API}/favorites`);
    setFavorites(data);
  }

  async function fetchWater() {
    const { data } = await axios.get(`${API}/water/${date}`);
    setWater(data.amount_ml);
  }

  async function fetchStats() {
    const { data } = await axios.get(`${API}/stats/weekly`);
    setStats(data);
  }

  async function addManualEntry() {
    if (!manual.food_name.trim() || !manual.calories) return;
    await axios.post(`${API}/diary`, {
      date,
      food_name: manual.food_name,
      quantity_grams: 0,
      calories: +manual.calories,
      protein: +manual.protein || 0,
      carbs: +manual.carbs || 0,
      fat: +manual.fat || 0,
      meal_type: manual.meal_type || 'בוקר'
    });
    setManual(emptyManual);
    fetchEntries();
  }

  async function addAiTextEntry() {
    if (!aiText.trim()) return;
    setParsing(true);
    try {
      await axios.post(`${API}/ai/parse-text`, { date, text: aiText, meal_type: aiMealType });
      setAiText('');
      fetchEntries();
    } finally {
      setParsing(false);
    }
  }

  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAiImage(reader.result); // Base64 string
    };
    reader.readAsDataURL(file);
  }

  async function addAiImageEntry() {
    if (!aiImage) return;
    setParsing(true);
    try {
      await axios.post(`${API}/ai/parse-image`, { date, image: aiImage, meal_type: aiMealType });
      setAiImage(null);
      fetchEntries();
    } finally {
      setParsing(false);
    }
  }

  async function deleteEntry(id) {
    await axios.delete(`${API}/diary/${id}`);
    fetchEntries();
  }

  async function addFavorite(foodEntry) {
    await axios.post(`${API}/favorites`, {
      food_name: foodEntry.food_name,
      quantity_grams: foodEntry.quantity_grams || 0,
      calories: foodEntry.calories || 0,
      protein: foodEntry.protein || 0,
      carbs: foodEntry.carbs || 0,
      fat: foodEntry.fat || 0,
    });
    fetchFavorites();
  }

  async function addFavoriteToDiary(fav, mealType) {
    await axios.post(`${API}/diary`, {
      date,
      food_name: fav.food_name,
      quantity_grams: fav.quantity_grams,
      calories: fav.calories,
      protein: fav.protein,
      carbs: fav.carbs,
      fat: fav.fat,
      meal_type: mealType || 'בוקר'
    });
    fetchEntries();
  }

  async function updateMealType(id, newMeal) {
    await axios.patch(`${API}/diary/${id}`, { meal_type: newMeal });
    fetchEntries();
  }

  async function deleteFavorite(id) {
    await axios.delete(`${API}/favorites/${id}`);
    fetchFavorites();
  }

  async function addWater(amount) {
    const { data } = await axios.post(`${API}/water`, { date, amount_ml: amount });
    setWater(data.amount_ml);
  }

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Group foods by meal
  const mealBuckets = ['בוקר', 'ביניים', 'צהריים', 'ערב', 'נשנושים'];
  const groupedEntries = mealBuckets.reduce((acc, meal) => {
    acc[meal] = entries.filter(e => e.meal_type === meal);
    return acc;
  }, {});

  const otherEntries = entries.filter(e => !mealBuckets.includes(e.meal_type));
  if (otherEntries.length > 0) {
    groupedEntries['אחר'] = otherEntries;
  }

  const isFavorite = (foodName) => favorites.some(fav => fav.food_name === foodName);

  return (
    <div className="app">
      <h1>יומן אכילה</h1>

      <div className="top-dashboard">
        <div className="date-picker">
          <label>תאריך: </label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div className="water-tracker">
          <h3>💧 שתיית מים</h3>
          <div className="water-row">
            <span><strong>{water} מ״ל</strong> / 2000 מ״ל</span>
            <div className="water-actions">
              <button className="water-btn minus" onClick={() => addWater(-250)} disabled={water <= 0}>- כוס</button>
              <button className="water-btn plus" onClick={() => addWater(250)}>+ כוס</button>
            </div>
          </div>
          <div className="progress-bg">
            <div className="progress-bar water" style={{ width: `${Math.min((water / 2000) * 100, 100)}%` }}></div>
          </div>
        </div>
      </div>

      <div className="goals-section">
        <h3>🎯 היעדים שלי</h3>
        <div className="goals-inputs">
          <label>
            קלוריות:
            <input type="number" value={targets.calories} onChange={e => setTargets(t => ({ ...t, calories: +e.target.value }))} />
          </label>
          <label>
            חלבון (ג׳):
            <input type="number" value={targets.protein} onChange={e => setTargets(t => ({ ...t, protein: +e.target.value }))} />
          </label>
          <label>
            פחמימות (ג׳):
            <input type="number" value={targets.carbs} onChange={e => setTargets(t => ({ ...t, carbs: +e.target.value }))} />
          </label>
          <label>
            שומן (ג׳):
            <input type="number" value={targets.fat} onChange={e => setTargets(t => ({ ...t, fat: +e.target.value }))} />
          </label>
        </div>
      </div>

      <div className="search-section">
        <div className="mode-tabs">
          <button className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}>הוספה ידנית</button>
          <button className={mode === 'text-ai' ? 'active' : ''} onClick={() => setMode('text-ai')}>ניתוח טקסט AI</button>
          <button className={mode === 'image-ai' ? 'active' : ''} onClick={() => setMode('image-ai')}>ניתוח תמונה AI</button>
          <button className={mode === 'favorites' ? 'active' : ''} onClick={() => setMode('favorites')}>⭐ מועדפים</button>
          <button className={mode === 'stats' ? 'active' : ''} onClick={() => setMode('stats')}>📊 סטטיסטיקה</button>
        </div>

        {mode === 'manual' && (
          <div className="manual-form">
            <div className="manual-row">
              <input
                type="text"
                placeholder="שם המזון *"
                value={manual.food_name}
                onChange={e => setManual(m => ({ ...m, food_name: e.target.value }))}
              />
              <select
                value={manual.meal_type}
                onChange={e => setManual(m => ({ ...m, meal_type: e.target.value }))}
              >
                <option value="בוקר">בוקר</option>
                <option value="ביניים">ביניים</option>
                <option value="צהריים">צהריים</option>
                <option value="ערב">ערב</option>
                <option value="נשנושים">נשנושים</option>
              </select>
            </div>
            <div className="manual-fields">
              <label>
                קלוריות *
                <input type="number" min="0" placeholder="0" value={manual.calories}
                  onChange={e => setManual(m => ({ ...m, calories: e.target.value }))} />
              </label>
              <label>
                חלבון (ג׳)
                <input type="number" min="0" placeholder="0" value={manual.protein}
                  onChange={e => setManual(m => ({ ...m, protein: e.target.value }))} />
              </label>
              <label>
                פחמימות (ג׳)
                <input type="number" min="0" placeholder="0" value={manual.carbs}
                  onChange={e => setManual(m => ({ ...m, carbs: e.target.value }))} />
              </label>
              <label>
                שומן (ג׳)
                <input type="number" min="0" placeholder="0" value={manual.fat}
                  onChange={e => setManual(m => ({ ...m, fat: e.target.value }))} />
              </label>
            </div>
            <button
              className="add-btn"
              onClick={addManualEntry}
              disabled={!manual.food_name.trim() || !manual.calories}
            >
              הוסף לרשימה
            </button>
          </div>
        )}

        {mode === 'text-ai' && (
          <div className="ai-text-form">
            <div className="ai-options">
              <label>בחר סוג ארוחה:</label>
              <select value={aiMealType} onChange={e => setAiMealType(e.target.value)} className="ai-meal-select">
                <option value="בוקר">בוקר</option>
                <option value="ביניים">ביניים</option>
                <option value="צהריים">צהריים</option>
                <option value="ערב">ערב</option>
                <option value="נשנושים">נשנושים</option>
              </select>
            </div>
            <textarea
              placeholder="תרשום מה אכלת היום... למשל: אכלתי 3 כפות אורז ופחית טונה"
              value={aiText}
              onChange={e => setAiText(e.target.value)}
            />
            <button className="ai-btn" onClick={addAiTextEntry} disabled={parsing || !aiText.trim()}>
              {parsing ? 'מנתח...' : 'נתח ושמור'}
            </button>
          </div>
        )}

        {mode === 'image-ai' && (
          <div className="ai-image-form">
            <p className="hint">העלה תמונה של הצלחת וה-AI ינתח את המאכלים והקלוריות:</p>
            <div className="ai-options">
              <label>בחר סוג ארוחה:</label>
              <select value={aiMealType} onChange={e => setAiMealType(e.target.value)} className="ai-meal-select">
                <option value="בוקר">בוקר</option>
                <option value="ביניים">ביניים</option>
                <option value="צהריים">צהריים</option>
                <option value="ערב">ערב</option>
                <option value="נשנושים">נשנושים</option>
              </select>
            </div>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
            {aiImage && (
              <div className="image-preview-container">
                <img src={aiImage} alt="צלחת" className="image-preview" />
              </div>
            )}
            <button className="ai-btn" onClick={addAiImageEntry} disabled={parsing || !aiImage}>
              {parsing ? 'מנתח תמונה...' : 'נתח ושמור'}
            </button>
          </div>
        )}

        {mode === 'favorites' && (
          <div className="favorites-form">
            {favorites.length === 0 ? (
              <p className="empty">אין לך עדיין מאכלים מועדפים</p>
            ) : (
              <ul className="favorites-list">
                {favorites.map(fav => (
                  <li key={fav.id} className="fav-item">
                    <div className="fav-info">
                      <strong className="fav-name">{fav.food_name}</strong>
                      <span className="fav-details">
                        {fav.quantity_grams > 0 ? `${fav.quantity_grams}ג׳ ` : ''}
                        · {fav.calories} קל׳ | ח: {fav.protein}ג׳ | פ: {fav.carbs}ג׳ | ש: {fav.fat}ג׳
                      </span>
                    </div>
                    <div className="fav-actions">
                      <select
                        defaultValue="בוקר"
                        onChange={e => fav._mealType = e.target.value}
                        className="fav-meal-select"
                      >
                        <option value="בוקר">בוקר</option>
                        <option value="ביניים">ביניים</option>
                        <option value="צהריים">צהריים</option>
                        <option value="ערב">ערב</option>
                        <option value="נשנושים">נשנושים</option>
                      </select>
                      <button className="add-fav-btn" onClick={() => addFavoriteToDiary(fav, fav._mealType || 'בוקר')}>הוסף ליומן</button>
                      <button className="del-btn" onClick={() => deleteFavorite(fav.id)}>✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {mode === 'stats' && (
          <div className="stats-form">
            <h3>📊 סיכום 7 הימים האחרונים</h3>
            {stats.length === 0 ? (
              <p className="empty">אין עדיין מספיק נתונים לסטטיסטיקה</p>
            ) : (
              <div className="stats-bars">
                {stats.map(day => (
                  <div key={day.date} className="stat-day">
                    <div className="stat-date">{day.date}</div>
                    <div className="stat-val">
                      <span><strong>{day.calories}</strong> / {targets.calories} קלוריות</span>
                      <div className="stat-bar-bg">
                        <div
                          className="stat-bar-fill calories"
                          style={{ width: `${Math.min((day.calories / targets.calories) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="diary-section">
        <h2>מה אכלתי היום</h2>
        {entries.length === 0 ? (
          <p className="empty">לא נרשמו ארוחות ליום זה</p>
        ) : (
          <div className="meals-container">
            {Object.keys(groupedEntries).map(meal => (
              groupedEntries[meal].length > 0 && (
                <div key={meal} className="meal-bucket">
                  <div className="meal-bucket-header">
                    <h3>{meal}</h3>
                    <span className="meal-calories">
                      {groupedEntries[meal].reduce((sum, item) => sum + item.calories, 0).toFixed(0)} קלוריות
                    </span>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>מזון</th>
                        <th>סוג ארוחה</th>
                        <th>כמות</th>
                        <th>קלוריות</th>
                        <th>חלבון</th>
                        <th>פחמימות</th>
                        <th>שומן</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedEntries[meal].map(e => (
                        <tr key={e.id}>
                          <td>{e.food_name}</td>
                          <td>
                            <select
                              value={e.meal_type || 'בוקר'}
                              onChange={(ev) => updateMealType(e.id, ev.target.value)}
                              className="inline-meal-select"
                            >
                              <option value="בוקר">בוקר</option>
                              <option value="ביניים">ביניים</option>
                              <option value="צהריים">צהריים</option>
                              <option value="ערב">ערב</option>
                              <option value="נשנושים">נשנושים</option>
                            </select>
                          </td>
                          <td>{e.quantity_grams > 0 ? `${e.quantity_grams}ג׳` : '—'}</td>
                          <td>{e.calories}</td>
                          <td>{e.protein}ג׳</td>
                          <td>{e.carbs}ג׳</td>
                          <td>{e.fat}ג׳</td>
                          <td className="entry-actions">
                            <button
                              className="fav-star-btn"
                              onClick={() => addFavorite(e)}
                              title={isFavorite(e.food_name) ? 'כבר במועדפים' : 'שמור במועדפים'}
                              disabled={isFavorite(e.food_name)}
                            >
                              {isFavorite(e.food_name) ? '🌟' : '⭐'}
                            </button>
                            <button className="del-btn" onClick={() => deleteEntry(e.id)}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ))}

            <div className="summary-dashboard">
              <h3>🎯 סיכום ערכים מול יעדים</h3>
              <div className="macro-progress-bars">
                <div className="macro-bar-item">
                  <div className="macro-bar-labels">
                    <span>🔥 קלוריות</span>
                    <span><strong>{totals.calories.toFixed(0)}</strong> / {targets.calories} קל׳</span>
                  </div>
                  <div className="progress-bg">
                    <div className="progress-bar calories" style={{ width: `${Math.min((totals.calories / targets.calories) * 100, 100)}%` }}></div>
                  </div>
                </div>

                <div className="macro-bar-item">
                  <div className="macro-bar-labels">
                    <span>🥩 חלבון</span>
                    <span><strong>{totals.protein.toFixed(1)}ג׳</strong> / {targets.protein}ג׳</span>
                  </div>
                  <div className="progress-bg">
                    <div className="progress-bar protein" style={{ width: `${Math.min((totals.protein / targets.protein) * 100, 100)}%` }}></div>
                  </div>
                </div>

                <div className="macro-bar-item">
                  <div className="macro-bar-labels">
                    <span>🌾 פחמימות</span>
                    <span><strong>{totals.carbs.toFixed(1)}ג׳</strong> / {targets.carbs}ג׳</span>
                  </div>
                  <div className="progress-bg">
                    <div className="progress-bar carbs" style={{ width: `${Math.min((totals.carbs / targets.carbs) * 100, 100)}%` }}></div>
                  </div>
                </div>

                <div className="macro-bar-item">
                  <div className="macro-bar-labels">
                    <span>🥑 שומן</span>
                    <span><strong>{totals.fat.toFixed(1)}ג׳</strong> / {targets.fat}ג׳</span>
                  </div>
                  <div className="progress-bg">
                    <div className="progress-bar fat" style={{ width: `${Math.min((totals.fat / targets.fat) * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
