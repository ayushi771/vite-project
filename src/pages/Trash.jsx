import { useEffect, useState } from "react";
import {
  getTrashRecipes,
  restoreRecipe,
  deletePermanent,
} from "/src/services/api";
import toast from "react-hot-toast";

export default function Trash({ user }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // LOAD TRASH RECIPES
  // -----------------------------
  useEffect(() => {
    if (!user?.id) return;

    async function load() {
      try {
        setLoading(true);
        const data = await getTrashRecipes(user.id);
        setRecipes(data || []);
      } catch (err) {
        console.error("Failed to load trash recipes:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user?.id]);

  // -----------------------------
  // RESTORE
  // -----------------------------
  async function handleRestore(id) {
    if (!id) return;

    const promise = restoreRecipe(id);

    toast.promise(promise, {
      loading: "Restoring recipe...",
      success: "Recipe restored successfully ✅",
      error: "Failed to restore recipe",
    });

    try {
      await promise;

      // remove from UI
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  // -----------------------------
  // DELETE PERMANENT
  // -----------------------------
  async function handleDeletePermanent(id) {
    if (!id) return;

    const promise = deletePermanent(id);

    toast.promise(promise, {
      loading: "Deleting recipe...",
      success: "Recipe deleted permanently ❌",
      error: "Failed to delete recipe",
    });

    try {
      await promise;

      // remove from UI
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  // -----------------------------
  // IMAGE HELPER
  // -----------------------------
  const getImage = (r) =>
    r.recipe_image ||
    (r.recipe_id
      ? `https://spoonacular.com/recipeImages/${r.recipe_id}-312x231.jpg`
      : "https://via.placeholder.com/312x231?text=No+Image");

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="page">
      <div className="atelier-shell">
        <div className="atelier-section-head">
          <h2>Trash</h2>
        </div>

        {loading ? (
          <div className="atelier-empty">
            <h2>Loading...</h2>
          </div>
        ) : recipes.length === 0 ? (
          <div className="atelier-empty" style={{ marginTop: 20 }}>
            <div className="atelier-empty-icon">🗑️</div>
            <h2>No recipes in Trash</h2>
            <p>Deleted recipes will appear here.</p>
          </div>
        ) : (
          <section className="rb-results">
            <div className="results-grid">
              {recipes.map((r) => (
                <article className="rb-card" key={r.id}>
                  <div className="rb-glow" />

                  <div className="rb-img">
                    <img src={getImage(r)} alt={r.recipe_title} />
                  </div>

                  <h3 className="rb-title">{r.recipe_title}</h3>

                  <div
                    className="atelier-card-actions"
                    style={{ marginTop: 16 }}
                  >
                    <button
                      className="atelier-button"
                      type="button"
                      onClick={() => handleRestore(r.id)}
                    >
                      Restore
                    </button>

                    <button
                      className="atelier-button atelier-button-secondary"
                      type="button"
                      onClick={() => handleDeletePermanent(r.id)}
                    >
                      Delete Forever
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}