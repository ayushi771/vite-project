import React, { useMemo } from "react";
import toast from "react-hot-toast";

export default function RecipeModal({ recipe, onClose, onSave, isAuthed }) {
  const importantNutrients = ["Calories", "Protein", "Fat", "Carbohydrates"];

  const filteredNutrition = useMemo(() => {
    return recipe?.nutrition?.nutrients?.filter((n) => importantNutrients.includes(n.title)) || [];
  }, [recipe]);

  if (!recipe) return null;

  const calories =
    recipe?.calories != null
      ? Math.round(recipe.calories)
      : (() => {
          const cal = recipe?.nutrition?.nutrients?.find(
            (n) => (n?.title || "").toLowerCase() === "calories"
          );
          return cal?.amount != null ? Math.round(cal.amount) : "—";
        })();

  const handleSave = async () => {
    if (!isAuthed) {
      toast.error("Please login to save recipes");
      return;
    }
    try {
      await onSave?.();
      toast.success(`Recipe saved! ${recipe.title}`);
    } catch (err) {
      toast.error(err?.message || "Could not save recipe");
    }
  };

  return (
    <div className="atelier-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="atelier-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Recipe details"
      >
        {/* TOP BAR */}
        <div className="atelier-modal-topbar">
          <button
            type="button"
            className="atelier-modal-save"
            onClick={handleSave}
            disabled={!isAuthed}
            title={!isAuthed ? "Login required to save" : ""}
          >
            {isAuthed ? "Save" : "Login to Save"}
          </button>

          <button
            type="button"
            className="atelier-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="recipe-detail">
          {/* HEADER */}
          <header className="recipe-detail-header">
            <div className="recipe-detail-media">
              {recipe.image ? (
                <img src={recipe.image} alt={recipe.title} />
              ) : (
                <div style={{ width: "100%", height: "100%", background: "#fff" }} />
              )}
            </div>

            <div className="recipe-detail-title">
              <p className="recipe-detail-kicker">Recipe</p>
              <h2>{recipe.title}</h2>

              <p className="recipe-detail-subtitle">
                {recipe.cuisine || recipe.diet || recipe.meal_type
                  ? "Tailored to your preferences."
                  : "A tasty recipe saved to your collection."}
              </p>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {recipe.cuisine && <span className="meta-pill">🍽 {recipe.cuisine}</span>}
                {recipe.diet && <span className="meta-pill">🥦 {recipe.diet}</span>}
                {recipe.meal_type && <span className="meta-pill">🍳 {recipe.meal_type}</span>}
              </div>
            </div>
          </header>

          {/* BODY */}
          <section className="recipe-detail-body">
            {/* STATS */}
            <div className="recipe-stats">
              <div>
                <strong>{recipe.readyInMinutes || "--"}</strong>
                <span>Minutes</span>
              </div>
              <div>
                <strong>{recipe.servings || "--"}</strong>
                <span>Servings</span>
              </div>
              <div>
                <strong>Easy</strong>
                <span>Difficulty</span>
              </div>
              <div>
                <strong>{calories}</strong>
                <span>Calories</span>
              </div>
            </div>

            {/* COLUMNS */}
            <div className="recipe-columns">
              {/* INGREDIENTS */}
              <section className="recipe-ingredients">
                <h3>Ingredients</h3>
                <ul>
                  {recipe.ingredients?.length ? (
                    recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)
                  ) : (
                    <li>No ingredients listed</li>
                  )}
                </ul>
              </section>

              {/* INSTRUCTIONS */}
              <section className="recipe-steps">
                <h3>Instructions</h3>

                {recipe.analyzedInstructions?.[0]?.steps?.length ? (
                  recipe.analyzedInstructions[0].steps.map((step) => (
                    <div key={step.number} className="step">
                      <span>{step.number}</span>
                      <p>{step.step}</p>
                    </div>
                  ))
                ) : recipe.instructions ? (
                  recipe.instructions
                    .replace(/<[^>]+>/g, "")
                    .split(".")
                    .filter((s) => s.trim().length > 0)
                    .map((sentence, index) => (
                      <div key={index} className="step">
                        <span>{index + 1}</span>
                        <p>{sentence.trim()}.</p>
                      </div>
                    ))
                ) : (
                  <p>No instructions available.</p>
                )}
              </section>
            </div>

            {/* NUTRITION */}
            {filteredNutrition.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h3>Nutrition</h3>
                <ul className="nutrition-list">
                  {filteredNutrition.map((n, idx) => (
                    <li key={idx}>
                      <strong>{n.title}</strong>: {Math.round(n.amount)} {n.unit}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
