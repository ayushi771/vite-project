import { useEffect, useState } from "react";
import {
  getSavedRecipes,
  deleteRecipe,
  getRecipeDetails,
} from "/src/services/recipeApi";
import Navbar from "/src/components/Navbar";
import "./SavedRecipes.css";
import toast from "react-hot-toast";

export default function SavedRecipes({ user, setUser, setShowAuth }) {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    if (!user) return;

    async function loadRecipes() {
      const data = await getSavedRecipes(user.id);
      setRecipes(data || []);
    }

    loadRecipes();
  }, [user]);

  async function handleDelete(id) {
  const promise = deleteRecipe(id);

  toast.promise(promise, {
    loading: "Deleting recipe...",
    success: "Recipe deleted successfully",
    error: "Failed to delete recipe",
  });

  try {
    await promise;
    setRecipes((prev) => prev.filter((recipe) => recipe.id !== id));
  } catch (err) {
    console.error(err);
  }
}

  async function handleView(recipeId) {
    const data = await getRecipeDetails(recipeId);
    setSelectedRecipe(data);
  }

  function handleLogout() {
    setUser(null);
    localStorage.removeItem("user");
  }

  function getRecipeImage(recipe) {
    return (
      recipe.recipe_image ||
      `https://spoonacular.com/recipeImages/${recipe.recipe_id}-312x231.jpg`
    );
  }

  const calories =
    selectedRecipe?.nutrition?.nutrients?.find((n) => n.name === "Calories")
      ?.amount ?? "--";

  return (
    <div>
      

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
                    <img src={getRecipeImage(recipe)} alt={recipe.recipe_title} />
                  </div>

                  <div className="rb-title">
                    <h3>{recipe.recipe_title}</h3>

                    <div className="atelier-card-actions">
                      <button
                        type="button"
                        className="atelier-button atelier-button-primary"
                        onClick={() => handleView(recipe.recipe_id)}
                      >
                        View
                      </button>
                      <button
                        type="button"
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
      </div>

      {/* MODAL */}
      {selectedRecipe && (
        <div
          className="atelier-modal-overlay"
          onClick={() => setSelectedRecipe(null)}
          role="presentation"
        >
          <div
            className="atelier-modal-card "
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Recipe details"
          >
            <button
              type="button"
              className="atelier-modal-close"
              onClick={() => setSelectedRecipe(null)}
              aria-label="Close"
            >
              ✕
            </button>

            {/* HEADER ROW: image left, title right */}
            <div className="recipe-detail">
              <header className="recipe-detail-header">
                <div className="recipe-detail-media">
                  <img src={selectedRecipe.image} alt={selectedRecipe.title} />
                </div>

                <div className="recipe-detail-title">
                  <p className="recipe-detail-kicker">Recipe</p>
                  <h2>{selectedRecipe.title}</h2>
                  <p className="recipe-detail-subtitle">
                    A tasty recipe saved to your collection.
                  </p>
                </div>
              </header>

              {/* BELOW HEADER: everything else */}
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
                    <strong>{calories}</strong>
                    <span>Calories</span>
                  </div>
                </div>

                <div className="recipe-columns">
                  <section className="recipe-ingredients">
                    <h3>Ingredients</h3>
                    <ul>
                      {selectedRecipe.extendedIngredients?.map((ing) => (
                        <li key={ing.id}>{ing.original}</li>
                      ))}
                    </ul>
                  </section>

                  <section className="recipe-steps">
                    <h3>Instructions</h3>
                    {selectedRecipe.analyzedInstructions?.[0]?.steps?.map(
                      (step) => (
                        <div key={step.number} className="step">
                          <span>{step.number}</span>
                          <p>{step.step}</p>
                        </div>
                      )
                    )}
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