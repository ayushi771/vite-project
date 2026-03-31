import React, { useMemo } from "react";

export default function RecipeModal({ recipe, onClose, onSave, isAuthed }) {
  const importantNutrients = ["Calories", "Protein", "Fat", "Carbohydrates"];

  const filteredNutrition = useMemo(() => {
    return (
      recipe?.nutrition?.nutrients?.filter((n) => importantNutrients.includes(n.title)) || []
    );
  }, [recipe]);

  if (!recipe) return null;

  return (
    <div className="rb-modal" role="dialog" aria-modal="true">
      <div className="rb-modal-card">
        <button className="modal-close" onClick={onClose} type="button">
          ×
        </button>

        <h2>{recipe.title}</h2>
        {recipe.image && <img src={recipe.image} alt={recipe.title} />}

        <div className="modal-meta">
          {recipe.cuisine && <span className="meta-pill">🍽 {recipe.cuisine}</span>}
          {recipe.diet && <span className="meta-pill">🥦 {recipe.diet}</span>}
          {recipe.meal_type && <span className="meta-pill">🍳 {recipe.meal_type}</span>}
          {recipe.calories && <span className="meta-pill">🔥 {Math.round(recipe.calories)} kcal</span>}
        </div>

        <h3>Ingredients</h3>
        <ul>
          {recipe.ingredients?.length ? recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>) : <li>No ingredients listed</li>}
        </ul>

        <h3>Instructions</h3>
        {recipe.instructions ? (
          <div
            className="instructions"
            style={{ whiteSpace: "pre-wrap" }}
            dangerouslySetInnerHTML={{ __html: recipe.instructions }}
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
          <button className="btn" onClick={onClose} type="button">
            Close
          </button>

          <button className="btn btn-primary" onClick={onSave} type="button">
            {isAuthed ? "Save to My Recipes" : "Login to Save"}
          </button>

          {recipe.sourceUrl && (
            <a className="btn btn-ghost" href={recipe.sourceUrl} target="_blank" rel="noreferrer">
              Source
            </a>
          )}
        </div>
      </div>
    </div>
  );
}