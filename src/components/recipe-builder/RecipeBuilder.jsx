import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchRecipes, autocompleteIngredients } from "/src/services/api";
import RBControls from "./RBControls";
import RBResults from "./RBResults";
import RecipeModal from "./RecipeModal";

export default function RecipeBuilder({ user, openLogin }) {
  const isAuthed = !!user;
  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredients, setIngredients] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  const [cuisine, setCuisine] = useState("");
  const [diet, setDiet] = useState("");
  const [mealType, setMealType] = useState("");
  const [maxCalories, setMaxCalories] = useState(800);
  const [number, setNumber] = useState(12);

  const [results, setResults] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authNotice, setAuthNotice] = useState("");

  const suggestionDebounce = useRef(null);
  const API_PREFIX = "/api";

  const requireAuth = useCallback(
    (actionLabel) => {
      if (isAuthed) return true;
      setAuthNotice(`Login required to ${actionLabel}.`);
      setError("");
      openLogin?.();
      return false;
    },
    [isAuthed, openLogin]
  );

  useEffect(() => {
    if (isAuthed) setAuthNotice("");
  }, [isAuthed]);

  // -----------------------
  // Autocomplete
  // -----------------------
  useEffect(() => {
    if (!ingredientInput) {
      setSuggestions([]);
      return;
    }

    if (suggestionDebounce.current) clearTimeout(suggestionDebounce.current);

    suggestionDebounce.current = setTimeout(async () => {
      try {
        const data = await autocompleteIngredients(ingredientInput);
        setSuggestions(data || []);
      } catch (err) {
        console.error("Autocomplete failed", err);
      }
    }, 220);

    return () => clearTimeout(suggestionDebounce.current);
  }, [ingredientInput]);

  const addIngredient = useCallback(
    (value) => {
      const v = (value || ingredientInput || "").trim().toLowerCase();
      if (!v) return;

      setIngredients((prev) => (prev.includes(v) ? prev : [...prev, v]));
      setIngredientInput("");
      setSuggestions([]);
    },
    [ingredientInput]
  );

  const removeIngredient = useCallback((i) => {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const resetAll = useCallback(() => {
    setIngredientInput("");
    setIngredients([]);
    setSuggestions([]);
    setCuisine("");
    setDiet("");
    setMealType("");
    setMaxCalories(800);
    setNumber(12);
    setResults([]);
    setSelectedRecipe(null);
    setError("");
    setAuthNotice("");
  }, []);

  // -----------------------
  // Search / Surprise
  // -----------------------
  const doSearch = useCallback(
    async () => {
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
    },
    [requireAuth, ingredients, cuisine, diet, mealType, maxCalories, number]
  );

  const openRecipeDetails = useCallback(
    async (r) => {
      setError("");
      setSelectedRecipe(null);
      setLoading(true);

      try {
        const recipeId = r.id || r.spoonacular_id || r.spoonacularId;
        const res = await fetch(`${API_PREFIX}/spoonacular/recipes/${recipeId}`);

        if (!res.ok) throw new Error(`Failed to load recipe (${res.status})`);
        const details = await res.json();

        const ingredientsList = (details.extendedIngredients || []).map((i) =>
          i.original || `${i.amount || ""} ${i.unit || ""} ${i.name || ""}`.trim()
        );

        let instructions = "";
        if (details.instructions) instructions = details.instructions;
        else if (details.analyzedInstructions?.length) {
          instructions = details.analyzedInstructions[0].steps
            .map((step) => step.number + ". " + step.step)
            .join("\n");
        }

        const nutrients = details.nutrition?.nutrients || [];
        const caloriesObj = nutrients.find((n) => (n.name || n.title || "").toLowerCase() === "calories");
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
          servings: details.servings || null,
          nutrition: details.nutrition || null,
          sourceUrl: details.sourceUrl || details.spoonacularSourceUrl || null,
        });
      } catch (err) {
        console.error("openRecipeDetails error", err);
        setError(err.message || "Failed to load recipe details");
      } finally {
        setLoading(false);
      }
    },
    [API_PREFIX]
  );

  const surprise = useCallback(() => {
    if (!requireAuth("use Surprise recipe")) return;
    if (!results.length) return;
    const idx = Math.floor(Math.random() * results.length);
    openRecipeDetails(results[idx]);
  }, [requireAuth, results, openRecipeDetails]);

  // -----------------------
  // Save selected recipe (full handler)
  // -----------------------
const handleSaveSelected = useCallback(async () => {
  if (!selectedRecipe) return;
  if (!requireAuth("save recipes")) return;

  // Defensive checks
  const uid = user?.id;
  const rid = selectedRecipe?.spoonacular_id ?? selectedRecipe?.id;
  if (!uid) {
    console.error("No user id present", user);
    alert("User id missing. Please login again.");
    return;
  }
  if (!rid) {
    console.error("No recipe id present", selectedRecipe);
    alert("Recipe id missing.");
    return;
  }

  try {
    // <-- IMPORTANT: send exactly the fields backend requires
    const payload = {
      user_id: Number(uid),
      recipe_id: Number(rid),
      recipe_title: selectedRecipe.title || "",
      recipe_image: selectedRecipe.image || ""
    };

    console.log("Saving recipe payload:", payload);

    const res = await fetch(`${API_PREFIX}/save_recipe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // parse body safely
    const json = await res.json().catch(() => null);
    console.log("save_recipe status", res.status, "body:", json);

    if (!res.ok) {
      const errDetail = json?.detail ?? json ?? `Request failed (${res.status})`;
      throw new Error(typeof errDetail === "string" ? errDetail : JSON.stringify(errDetail));
    }

    // Success — broadcast so SavedRecipes can refresh if needed
    window.dispatchEvent(new CustomEvent("recipeSaved", { detail: json }));

    
  } catch (err) {
    console.error("save recipe error:", err);
   
  }
}, [selectedRecipe, requireAuth, user]);

  const primarySearchLabel = useMemo(() => {
    if (loading) return "Searching...";
    return isAuthed ? "Find Recipes" : "Login to Find Recipes";
  }, [loading, isAuthed]);

  return (
    <main className="recipe-builder">
      <RBControls
        ingredientInput={ingredientInput}
        setIngredientInput={setIngredientInput}
        addIngredient={addIngredient}
        suggestions={suggestions}
        ingredients={ingredients}
        removeIngredient={removeIngredient}
        cuisine={cuisine}
        setCuisine={setCuisine}
        diet={diet}
        setDiet={setDiet}
        mealType={mealType}
        setMealType={setMealType}
        maxCalories={maxCalories}
        setMaxCalories={setMaxCalories}
        number={number}
        setNumber={setNumber}
        doSearch={doSearch}
        resetAll={resetAll}
        surprise={surprise}
        loading={loading}
        isAuthed={isAuthed}
        primarySearchLabel={primarySearchLabel}
        hasResults={results.length > 0}
      />

      {(authNotice || error) && (
        <section className="rb-feedback-area">
          {authNotice && (
            <div className="rb-auth-notice">
              <span className="rb-feedback-icon">🔒</span>
              <span>{authNotice}</span>
            </div>
          )}

          {error && (
            <div className="rb-error">
              <span className="rb-feedback-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </section>
      )}

      <RBResults results={results} loading={loading} onOpen={openRecipeDetails} />

      <RecipeModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onSave={handleSaveSelected}
        isAuthed={isAuthed}
      />
    </main>
  );
}