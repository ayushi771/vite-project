import { useEffect, useState } from "react";
import {
  getSavedRecipes,
  deleteRecipe,
  getRecipeDetails,
} from "/src/services/api";
import "./SavedRecipes.css";
import toast from "react-hot-toast";

export default function SavedRecipes({ user, setUser }) {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // -----------------------
  // LOAD SAVED RECIPES
  // -----------------------
  useEffect(() => {
    if (!user) return;

    async function loadRecipes() {
      try {
        const data = await getSavedRecipes(user.id);
        setRecipes(data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load saved recipes");
      }
    }

    loadRecipes();
  }, [user]);

  // -----------------------
  // DELETE
  // -----------------------
  async function handleDelete(id) {
    const promise = deleteRecipe(id);

    toast.promise(promise, {
      loading: "Deleting recipe...",
      success: "Recipe deleted successfully",
      error: "Failed to delete recipe",
    });

    try {
      await promise;
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  // -----------------------
  // VIEW DETAILS (FIXED)
  // -----------------------
  async function handleView(recipeId) {
    if (!recipeId) {
      toast.error("Recipe ID missing");
      return;
    }

    try {
      const details = await getRecipeDetails(recipeId);

      const ingredientsList = (details.extendedIngredients || []).map(
        (i) =>
          i.original ||
          `${i.amount || ""} ${i.unit || ""} ${i.name || ""}`.trim()
      );

      let instructions = "";
      if (details.instructions) instructions = details.instructions;
      else if (details.analyzedInstructions?.length) {
        instructions = details.analyzedInstructions[0].steps
          .map((step) => step.number + ". " + step.step)
          .join("\n");
      }

      const nutrients = details.nutrition?.nutrients || [];
      const caloriesObj = nutrients.find(
        (n) => (n.name || n.title || "").toLowerCase() === "calories"
      );

      setSelectedRecipe({
        id: details.id,
        title: details.title,
        image: details.image,
        ingredients: ingredientsList,
        instructions: instructions || "No instructions provided.",
        readyInMinutes: details.readyInMinutes || null,
        servings: details.servings || null,
        calories: caloriesObj ? Math.round(caloriesObj.amount) : "--",
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load recipe");
    }
  }

  // -----------------------
  // IMAGE HELPER
  // -----------------------
  function getRecipeImage(recipe) {
    return (
      recipe.recipe_image ||
      `https://spoonacular.com/recipeImages/${recipe.recipe_id}-312x231.jpg`
    );
  }

  // -----------------------
  // UI
  // -----------------------
  return (
    <div className="atelier-shell">
      <section className="atelier-hero">
        <div className="atelier-hero-copy">
          <p className="atelier-eyebrow">Your kitchen shelf</p>
          <h1>Saved Recipes</h1>
          <p className="atelier-lead">
            All your favorite recipes in one beautifully crafted space.
          </p>
        </div>
      </section>

      {recipes.length === 0 ? (
        <div className="atelier-empty">
          <div className="atelier-empty-icon">🍝</div>
          <h2>No saved recipes yet</h2>
          <p>Your saved dishes will appear here.</p>
        </div>
      ) : (
        <>
          <div className="atelier-section-head">
            <h2>Your Collection</h2>
          </div>

          <section className="results-grid">
            {recipes.map((recipe) => (
              <article className="atelier-card" key={recipe.id}>
                <div className="rb-img">
                  <img
                    src={getRecipeImage(recipe)}
                    alt={recipe.recipe_title}
                  />
                </div>

                <div className="rb-title">
                  <h3>{recipe.recipe_title}</h3>

                  <div className="atelier-card-actions">
                    <button
                      className="atelier-button atelier-button-primary"
                      onClick={() => handleView(recipe.recipe_id)}
                    >
                      View
                    </button>

                    <button
                      className="atelier-button atelier-button-secondary"
                      onClick={() => handleDelete(recipe.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </>
      )}

      {/* -----------------------
          MODAL (FIXED)
      ----------------------- */}
      {selectedRecipe && (
        <div
          className="atelier-modal-overlay"
          onClick={() => setSelectedRecipe(null)}
        >
          <div
            className="atelier-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="atelier-modal-close"
              onClick={() => setSelectedRecipe(null)}
            >
              ✕
            </button>

            <div className="recipe-detail">
              {/* HEADER */}
              <header className="recipe-detail-header">
                <div className="recipe-detail-media">
                  <img
                    src={selectedRecipe.image}
                    alt={selectedRecipe.title}
                  />
                </div>

                <div className="recipe-detail-title">
                  <p className="recipe-detail-kicker">Recipe</p>
                  <h2>{selectedRecipe.title}</h2>
                </div>
              </header>

              {/* BODY */}
              <section className="recipe-detail-body">
                <div className="recipe-stats">
                  <div>
                    <strong>{selectedRecipe.readyInMinutes || "--"}</strong>
                    <span>Minutes</span>
                  </div>
                  <div>
                    <strong>{selectedRecipe.servings || "--"}</strong>
                    <span>Servings</span>
                  </div>
                  <div>
                    <strong>Easy</strong>
                    <span>Difficulty</span>
                  </div>
                  <div>
                    <strong>{selectedRecipe.calories}</strong>
                    <span>Calories</span>
                  </div>
                </div>

                <div className="recipe-columns">
                  {/* INGREDIENTS */}
                  <section className="recipe-ingredients">
                    <h3>Ingredients</h3>
                    <ul>
                      {selectedRecipe.ingredients.map((ing, i) => (
                        <li key={i}>{ing}</li>
                      ))}
                    </ul>
                  </section>

                  {/* INSTRUCTIONS */}
                  <section className="recipe-steps">
                    <h3>Instructions</h3>

                    {selectedRecipe.instructions
                      .split("\n")
                      .filter((s) => s.trim())
                      .map((step, i) => (
                        <div key={i} className="step">
                          <span>{i + 1}</span>
                          <p>{step}</p>
                        </div>
                      ))}
                  </section>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}