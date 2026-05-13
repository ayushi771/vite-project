import { useEffect, useState } from "react";
import {
  getTrashRecipes,
  restoreRecipe,
  deletePermanent,
} from "/src/services/recipeApi";
import Navbar from "/src/components/Navbar";
import toast from "react-hot-toast";
export default function Trash({ user }) {
  const [recipes, setRecipes] = useState([]);

  function handleLogout() {
    localStorage.removeItem("token");
    window.location.reload();
  }

  useEffect(() => {
    if (!user?.id) return;

    async function load() {
      const data = await getTrashRecipes(user.id);
      setRecipes(data || []);
    }

    load();
  }, [user?.id]);

  async function restore(id) {
    const promise = restoreRecipe(id);

    toast.promise(promise, {
      loading: "Restoring recipe...",
      success: "Recipe restored successfully ✅",
      error: "Failed to restore recipe",
    });

    try {
      await promise;
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  async function remove(id) {
    const promise = deletePermanent(id);

    toast.promise(promise, {
      loading: "Deleting recipe...",
      success: "Recipe deleted permanently ",
      error: "Failed to delete recipe",
    });

    try {
      await promise;
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  const getImage = (r) =>
    r.recipe_image ||
    (r.recipe_id
      ? `https://spoonacular.com/recipeImages/${r.recipe_id}-312x231.jpg`
      : "");

  return (
    <div className="page">
      

      <div className="atelier-shell">
        <div className="atelier-section-head">
          <h2>Trash</h2>
        </div>

        <section className="rb-results">
          <div className="results-grid">
            {recipes.map((r) => (
              <article className="rb-card" key={r.id}>
                <div className="rb-glow" />

                <div className="rb-img">
                  <img src={getImage(r)} alt={r.recipe_title} />
                </div>

                <h3 className="rb-title">{r.recipe_title}</h3>

                <div className="atelier-card-actions" style={{ marginTop: 16 }}>
                  <button
                    className="atelier-button"
                    type="button"
                    onClick={() => restore(r.id)}
                  >
                    Restore
                  </button>

                  <button
                    className="atelier-button atelier-button-secondary"
                    type="button"
                    onClick={() => remove(r.id)}
                  >
                    Delete Forever
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {recipes.length === 0 && (
          <div className="atelier-empty" style={{ marginTop: 20 }}>
            <div className="atelier-empty-icon">🗑️</div>
            <h2>No recipes in Trash</h2>
            <p>Deleted recipes will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}