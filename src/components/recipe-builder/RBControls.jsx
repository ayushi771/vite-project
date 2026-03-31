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

export default function RBControls({
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
  surprise,
  loading,
  isAuthed,
  primarySearchLabel,
  hasResults,
}) {
  return (
    <section className="rb-controls">
      <div className="rb-ingredients">
        <div className="rb-input-row">
          <input
            aria-label="Ingredient"
            placeholder="Add ingredient (press Enter or click +)"
            value={ingredientInput}
            onChange={(e) => setIngredientInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addIngredient()}
          />
          <button className="btn btn-primary" onClick={() => addIngredient()}>
            +
          </button>
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
            <button key={ing} className="chip" onClick={() => removeIngredient(i)}>
              {ing} <span className="chip-x">×</span>
            </button>
          ))}
        </div>

        {ingredients.length === 0 && (
          <p className="rb-hint" style={{ marginTop: 12 }}>
            Tip: add 2–5 ingredients (e.g., chicken, garlic, rice).
          </p>
        )}
      </div>

      <div className="rb-filters">
        <label>
          Cuisine
          <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
            {CUISINES.map((c) => (
              <option key={c} value={c}>
                {c || "Any"}
              </option>
            ))}
          </select>
        </label>

        <label>
          Diet
          <select value={diet} onChange={(e) => setDiet(e.target.value)}>
            {DIET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <div className="rb-mealtypes">
          {MEAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`meal-btn ${mealType === opt.value ? "active" : ""}`}
              onClick={() => setMealType((prev) => (prev === opt.value ? "" : opt.value))}
              type="button"
            >
              <span className="emoji">{opt.emoji}</span>
              <span className="label">{opt.label}</span>
            </button>
          ))}
        </div>

        <label className="rb-cal">
          Max Calories: <strong>{maxCalories}</strong>
          <input
            type="range"
            min="100"
            max="2000"
            step="25"
            value={maxCalories}
            onChange={(e) => setMaxCalories(Number(e.target.value))}
          />
        </label>

        <label>
          Results:
          <input
            type="number"
            min="1"
            max="48"
            value={number}
            onChange={(e) => setNumber(Number(e.target.value))}
          />
        </label>

        <div className="rb-actions">
          <button className="btn btn-primary" onClick={doSearch} disabled={loading} type="button">
            {primarySearchLabel}
          </button>

          <button className="btn" onClick={resetAll} disabled={loading} type="button">
            Reset
          </button>

          
        </div>
      </div>
    </section>
  );
}