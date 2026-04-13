import { useEffect, useState } from "react";
import { getSavedRecipes, deleteRecipe , getRecipeDetails } from "/src/services/recipeApi";
import Navbar from "/src/components/Navbar";

export default function SavedRecipes({ user }) {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
 
  useEffect(() => {
    if (!user) return;

    async function load() {
      const data = await getSavedRecipes(user.id);
      setRecipes(data || []);
    }

    load();
  }, [user]);

  async function handleDelete(id) {
    await deleteRecipe(id);
    setRecipes(prev => prev.filter(r => r.id !== id));
  }
  async function handleView(recipe_id) {
    const data = await getRecipeDetails(recipe_id);
    setSelectedRecipe(data);
  }
   function handleLogin(userData) {
    console.log("handleLogin received:", userData);
    setUser(userData); // updates App's top-level user
    localStorage.setItem("user", JSON.stringify(userData));
    setShowAuth(false);
  }

  function handleLogout() {
    setUser(null); // updates App's top-level user
    localStorage.removeItem("user");
    setRecipe(null);
  }
  return (
    
    <div className="page">
      <Navbar user={user} onLoginClick={() => setShowAuth(true)} onLogout={handleLogout }  />
      <h2>Saved Recipes</h2>

      <div className="grid">
        {recipes.length === 0 && (
          <p>No saved recipes yet.</p>
        )}

        {recipes.map((r) => (
          <div className="card" key={r.id}>
            <img style={{height: "150px", objectFit: "cover", width: "100%"}}
               src={
                r.recipe_image ||
               `https://spoonacular.com/recipeImages/${r.recipe_id}-312x231.jpg`
         }
            alt={r.recipe_title}
          />
            <h3>{r.recipe_title}</h3>
              <button onClick={() => handleView(r.recipe_id)}>
              View Recipe
              </button>

            <button onClick={() => handleDelete(r.id)}>
              Move to Trash
            </button>
          </div>
        ))}
      </div>
      {selectedRecipe && (
        <div className="recipe-modal-overlay">
           <div className="recipe-modal-card">
          <h2>{selectedRecipe.title}</h2>
          {selectedRecipe.image && (
            <img src={selectedRecipe.image} alt={selectedRecipe.title} loading="lazy" />
          )}
          <h3>Ingredients</h3>
          <ul>
            {selectedRecipe.ingredients.map((ing, index) => (
              <li key={index}>{ing}</li>
            ))}
          </ul>
          <h3>Instructions</h3>
          <p dangerouslySetInnerHTML={{ __html: selectedRecipe.instructions }}></p>
          <button onClick={() => setSelectedRecipe(null)}>Close</button>
        </div>
        </div>
      )}
    </div>
  );
}