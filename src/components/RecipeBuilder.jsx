import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { searchRecipes, autocompleteIngredient } from "/src/services/spoonacularApi";

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

export default function RecipeBuilder({ user, openLogin }) {
  const isAuthed = !!user;

  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredients, setIngredients] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [cuisine, setCuisine] = useState("");
  const [diet, setDiet] = useState("");
  const [mealType, setMealType] = useState("");
  const [maxCalories, setMaxCalories] = useState(800);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [error, setError] = useState("");
  const [number, setNumber] = useState(12);

  // advanced: show a dedicated “login required” banner for demo clarity
  const [authNotice, setAuthNotice] = useState("");

  const suggestionDebounce = useRef(null);
  const API_PREFIX = "/api";

  const canSearch = useMemo(() => {
    // you can tune this rule; it helps demonstrate “locked until login”
    return isAuthed;
  }, [isAuthed]);

  const requireAuth = useCallback(
    (actionLabel) => {
      if (isAuthed) return true;

      setAuthNotice(`Login required to ${actionLabel}.`);
      setError(""); // keep errors for functional issues, not auth
      openLogin?.();
      return false;
    },
    [isAuthed, openLogin]
  );

  // clear auth notice once user logs in
  useEffect(() => {
    if (isAuthed) setAuthNotice("");
  }, [isAuthed]);

  useEffect(() => {
    if (!ingredientInput) {
      setSuggestions([]);
      return;
    }

    if (suggestionDebounce.current) clearTimeout(suggestionDebounce.current);

    suggestionDebounce.current = setTimeout(async () => {
      try {
        const data = await autocompleteIngredient(ingredientInput);
        setSuggestions(data || []);
      } catch (err) {
        console.error("Autocomplete failed", err);
      }
    }, 220);

    return () => clearTimeout(suggestionDebounce.current);
  }, [ingredientInput]);

  function addIngredient(value) {
    const v = (value || ingredientInput || "").trim().toLowerCase();
    if (!v) return;

    if (!ingredients.includes(v)) setIngredients((prev) => [...prev, v]);

    setIngredientInput("");
    setSuggestions([]);
  }

  function removeIngredient(i) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function doSearch() {
    if (!requireAuth("search recipes")) return;

    setAuthNotice("");
    setError("");
    setLoading(true);
    setResults([]);
    setSelectedRecipe(null);

    try {
      if (ingredients.length === 0) {
        setError("Add at least 1 ingredient to search.");
        return;
      }

      const data = await searchRecipes({
        ingredients,
        cuisine,
        diet,
        meal_type: mealType,
        max_calories: maxCalories,
        number,
      });

      const resList = data.results || [];
      setResults(resList);

      if (resList.length === 0) {
        setError("No recipes found. Try different filters or fewer ingredients.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function surprise() {
    if (!requireAuth("use Surprise recipe")) return;
    if (!results.length) return;

    const idx = Math.floor(Math.random() * results.length);
    openRecipeDetails(results[idx]);
  }

  async function openRecipeDetails(r) {
    // optionally allow viewing details without login:
    // if you want to lock viewing too, uncomment:
    // if (!requireAuth("view recipe details")) return;

    setError("");
    setSelectedRecipe(null);
    setLoading(true);

    try {
      const recipeId = r.id || r.spoonacular_id || r.spoonacularId;
      const res = await fetch(`${API_PREFIX}/spoonacular/recipes/${recipeId}`);

      if (!res.ok) throw new Error(`Failed to load recipe (${res.status})`);

      const details = await res.json();

      // INGREDIENTS NORMALIZATION
      const ingredientsList = (details.extendedIngredients || []).map((i) =>
        i.original || `${i.amount || ""} ${i.unit || ""} ${i.name || ""}`.trim()
      );

      // INSTRUCTIONS NORMALIZATION
      let instructions = "";
      if (details.instructions) {
        instructions = details.instructions;
      } else if (details.analyzedInstructions?.length) {
        instructions = details.analyzedInstructions[0].steps
          .map((step) => step.number + ". " + step.step)
          .join("\n");
      }

      // NUTRITION NORMALIZATION
      const nutrients = details.nutrition?.nutrients || [];
      const caloriesObj = nutrients.find(
        (n) => (n.name || n.title || "").toLowerCase() === "calories"
      );
      const calories = caloriesObj ? caloriesObj.amount : null;

      setSelectedRecipe({
        spoonacular_id: details.id,
        title: details.title,
        image: details.image,

        instructions: instructions || "No instructions provided.",
        ingredients: ingredientsList,

        readyInMinutes: details.readyInMinutes || null,
        cuisine: details.cuisines?.[0] || "",
        diet: details.diets?.[0] || "",
        meal_type: details.dishTypes?.[0] || "",

        calories,

        dish_types: details.dishTypes || [],
        nutrition: details.nutrition || null,

        sourceUrl: details.sourceUrl || details.spoonacularSourceUrl || null,
      });
    } catch (err) {
      console.error("openRecipeDetails error", err);
      setError(err.message || "Failed to load recipe details");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSelected() {
    if (!selectedRecipe) return;
    if (!requireAuth("save recipes")) return;

    try {
      const res = await fetch("/api/save_recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          recipe_id: selectedRecipe.spoonacular_id,
          recipe_title: selectedRecipe.title,
        }),
      });

      if (!res.ok) throw new Error("Failed to save recipe");
      alert("Recipe saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Error saving recipe");
    }
  }

  const importantNutrients = ["Calories", "Protein", "Fat", "Carbohydrates"];

  const filteredNutrition =
    selectedRecipe?.nutrition?.nutrients?.filter((n) =>
      importantNutrients.includes(n.title)
    ) || [];

  const primarySearchLabel = useMemo(() => {
    if (loading) return "Searching...";
    return canSearch ? "Find Recipes" : "Login to Find Recipes";
  }, [loading, canSearch]);

  return (
    <main className="recipe-builder page">
      {/* Advanced auth notice */}
      {!isAuthed && (
        <div className="rb-auth-lock">
          <strong>Locked features:</strong> Searching, Surprise, and Saving recipes require login.
          <button className="btn btn-primary" style={{ marginLeft: 12 }} onClick={() => openLogin?.()}>
            Login / Register
          </button>
        </div>
      )}

      {authNotice && <div className="rb-auth-notice">{authNotice}</div>}

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
            Results:{" "}
            <input
              type="number"
              min="1"
              max="48"
              value={number}
              onChange={(e) => setNumber(Number(e.target.value))}
            />
          </label>

          <div className="rb-actions">
            <button
              className={`btn ${canSearch ? "btn-primary" : "btn-primary"}`}
              onClick={doSearch}
              disabled={loading}
              title={!canSearch ? "Login required" : ""}
            >
              {primarySearchLabel}
            </button>

            <button
              className="btn"
              onClick={() => {
                setIngredients([]);
                setCuisine("");
                setDiet("");
                setMealType("");
                setMaxCalories(800);
                setResults([]);
                setSelectedRecipe(null);
                setError("");
                setAuthNotice("");
              }}
            >
              Reset
            </button>

            <button
              className="btn btn-ghost"
              onClick={surprise}
              disabled={!results.length || loading}
              title={!isAuthed ? "Login required" : !results.length ? "Search first" : ""}
            >
              Surprise {!isAuthed ? " (Login)" : ""}
            </button>
          </div>
        </div>
      </section>

      {error && <div className="rb-error">{error}</div>}

      <section className="rb-results">
        {results.length === 0 && !loading && (
          <p className="rb-hint">No results yet — add ingredients and press "Find Recipes".</p>
        )}

        <div className="grid">
          {results.map((r) => (
            <article className="card" key={r.id} onClick={() => openRecipeDetails(r)}>
              {r.image && <img src={r.image} alt={r.title} loading="lazy" />}
              <div className="card-body">
                <h3>{r.title}</h3>
                <div className="card-meta">
                  {r.nutrition?.nutrients &&
                    r.nutrition.nutrients.find((n) => n.title === "Calories") && (
                      <span className="meta">
                        🔥{" "}
                        {Math.round(
                          r.nutrition.nutrients.find((n) => n.title === "Calories").amount
                        )}{" "}
                        kcal
                      </span>
                    )}
                  <span className="meta">⏱ {r.readyInMinutes ?? "—"} min</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedRecipe && (
        <div className="rb-modal">
          <div className="rb-modal-card">
            <button className="modal-close" onClick={() => setSelectedRecipe(null)}>
              ×
            </button>

            <h2>{selectedRecipe.title}</h2>
            {selectedRecipe.image && <img src={selectedRecipe.image} alt={selectedRecipe.title} />}

            <div className="modal-meta">
              {selectedRecipe.cuisine && <span className="meta-pill">🍽 {selectedRecipe.cuisine}</span>}
              {selectedRecipe.diet && <span className="meta-pill">🥦 {selectedRecipe.diet}</span>}
              {selectedRecipe.meal_type && (
                <span className="meta-pill">🍳 {selectedRecipe.meal_type}</span>
              )}
              {selectedRecipe.calories && (
                <span className="meta-pill">🔥 {Math.round(selectedRecipe.calories)} kcal</span>
              )}
            </div>

            <h3>Ingredients</h3>
            <ul>
              {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 ? (
                selectedRecipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)
              ) : (
                <li>No ingredients listed</li>
              )}
            </ul>

            <h3>Instructions</h3>
            {selectedRecipe.instructions ? (
              <div
                className="instructions"
                style={{ whiteSpace: "pre-wrap" }}
                dangerouslySetInnerHTML={{ __html: selectedRecipe.instructions }}
              />
            ) : (
              <p>No instructions available.</p>
            )}

            {filteredNutrition.length > 0 && (
              <>
                <h4>Nutrition</h4>
                <ul className="nutrition-list">
                  {filteredNutrition.map((n, idx) => (
                    <li key={idx}>
                      <strong>{n.title}</strong>: {Math.round(n.amount)} {n.unit}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="modal-actions">
              <button className="btn" onClick={() => setSelectedRecipe(null)}>
                Close
              </button>

              <button
                className="btn btn-primary"
                onClick={handleSaveSelected}
                title={!isAuthed ? "Login required to save" : ""}
              >
                {isAuthed ? "Save to My Recipes" : "Login to Save"}
              </button>

              {selectedRecipe.sourceUrl && (
                <a className="btn btn-ghost" href={selectedRecipe.sourceUrl} target="_blank" rel="noreferrer">
                  Source
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}