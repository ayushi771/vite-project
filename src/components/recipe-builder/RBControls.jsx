import React from "react";

const DIET_OPTIONS = [
  { value: "", label: "Any" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "ketogenic", label: "Keto" },
];

const MEAL_OPTIONS = [
  { value: "", label: "Any", emoji: "🍽️" },
  { value: "breakfast", label: "Breakfast", emoji: "🥐" },
  { value: "lunch", label: "Lunch", emoji: "🥪" },
  { value: "dinner", label: "Dinner", emoji: "🍲" },
];

const CUISINES = [
  "",
  "american",
  "british",
  "chinese",
  "french",
  "italian",
  "indian",
  "mexican",
  "thai",
  "japanese",
  "mediterranean",
];

export default function RBControls(props) {
  const {
    ingredientInput,
    setIngredientInput,
    addIngredient,
    suggestions,
    ingredients,
    removeIngredient,
    cuisine,
    setCuisine,
    diet,
    setDiet,
    mealType,
    setMealType,
    maxCalories,
    setMaxCalories,
    number,
    setNumber,
    doSearch,
    resetAll,
    loading,
    primarySearchLabel,
  } = props;

  const injectedCss = `
:root{
  --bg: #f7efe6;
  --card: #fffefc;
  --muted-border: #efe4db;
  --muted-text: #8b7f78;
  --text: #34261f;
  --accent: #ff6a3d;
  --primary: #29c07c;
  --pill-shadow: rgba(233,224,215,0.95);
}

.rb-controls {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.rb-ingredients {
  flex: 1;
}

.rb-input-row {
  display: flex;
  gap: 8px;
}

.rb-input-row input {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--muted-border);
}

.rb-suggestions {
  margin-top: 8px;
  list-style: none;
  padding: 0;
}

.rb-suggestions li {
  padding: 8px;
  cursor: pointer;
}

.rb-chips {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  padding: 6px 10px;
  border-radius: 999px;
  background: #eee;
  border: none;
  cursor: pointer;
}

.chip-x {
  margin-left: 6px;
}

/* SIDEBAR STYLE */
.rb-filters {
  width: 320px;
  background: var(--card);
  border-radius: 16px;
  padding: 18px;
  box-shadow: 10px 12px 28px rgba(0,0,0,0.06);
  border: 1px solid var(--muted-border);
}

/* inputs */
.rb-filters select,
.rb-filters input {
  width: 100%;
  margin-top: 6px;
  margin-bottom: 12px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--muted-border);
}

/* meal buttons */
.rb-mealtypes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.meal-btn {
  display: flex;
  gap: 6px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid #e9e0d7;
  background: var(--card);
  cursor: pointer;
  font-weight: 600;
  box-shadow: 6px 6px 0 var(--pill-shadow);
}

.meal-btn.active {
  background: linear-gradient(90deg,var(--accent), #ff8b61);
  color: white;
  border: none;
}

/* buttons */
.btn {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--muted-border);
  cursor: pointer;
}

.btn-primary {
  background: var(--primary);
  color: white;
  border: none;
}

.rb-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}
`;

  return (
    <section className="rb-controls">
      <style dangerouslySetInnerHTML={{ __html: injectedCss }} />
      
      {/* LEFT INGREDIENTS */}
      <div className="rb-ingredients">
        <div className="rb-input-row">
          <input
            placeholder="Add ingredient..."
            value={ingredientInput}
            onChange={(e) => setIngredientInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addIngredient()}
          />
          <button className="btn btn-primary" onClick={addIngredient}>+</button>
        </div>

        {suggestions.length > 0 && (
          <ul className="rb-suggestions">
            {suggestions.map((s, i) => (
              <li key={i} onClick={() => addIngredient(s.name)}>
                {s.name}
              </li>
            ))}
          </ul>
        )}

        <div className="rb-chips">
          {ingredients.map((ing, i) => (
            <button key={i} className="chip" onClick={() => removeIngredient(i)}>
              {ing} <span className="chip-x">×</span>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT FILTER PANEL */}
      <div className="rb-filters">
        <h3>Filters</h3>
        <label>
          Cuisine
          <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
            {CUISINES.map((c) => (
              <option key={c} value={c}>{c || "Any"}</option>
            ))}
          </select>
        </label>

        <label>
          Diet
          <select value={diet} onChange={(e) => setDiet(e.target.value)}>
            {DIET_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </label>

        <div className="rb-mealtypes">
          {MEAL_OPTIONS.map((m) => (
            <button
              key={m.value}
              className={`meal-btn ${mealType === m.value ? "active" : ""}`}
              onClick={() => setMealType(mealType === m.value ? "" : m.value)}
              type="button"
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>

        <label>
          Max Calories: <strong>{maxCalories}</strong>
          <input
            type="range"
            min="100"
            max="2000"
            value={maxCalories}
            onChange={(e) => setMaxCalories(Number(e.target.value))}
          />
        </label>

        <label>
          Results
          <input
            type="number"
            value={number}
            onChange={(e) => setNumber(Number(e.target.value))}
          />
        </label>

        <div className="rb-actions">
          <button className="btn btn-primary" onClick={doSearch} disabled={loading}>
            {primarySearchLabel}
          </button>

          <button className="btn" onClick={resetAll} disabled={loading}>
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}