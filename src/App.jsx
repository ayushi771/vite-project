import React, { useState } from "react";
import viteLogo from "/chef-svgrepo-com.svg";
import "./App.css";

// Your Spoonacular API key
const API_KEY = "a1ccad35ec874207b7f0ce32bf3df420";

export default function App() {
  return (
    <>
      <Header />
      <Main />
    </>
  );
}

export function Header() {
  return (
    <header>
      <div className="logo-box">
        <img src={viteLogo} alt="Logo" className="logo" />
        <h3>Chef Find</h3>
      </div>
    </header>
  );
}

export function Main() {
  const [ingredients, setIngredients] = useState([]);
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Add ingredient
  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newIngredient = formData.get("ingredient").trim();

    if (!newIngredient) {
      setError("Please enter an ingredient.");
    } else if (ingredients.includes(newIngredient)) {
      setError("Ingredient already added.");
    } else {
      setIngredients((prev) => [...prev, newIngredient]);
      event.currentTarget.reset();
      setError("");
    }
  }

  // Fetch recipe from Spoonacular
  async function getRecipe() {
    if (ingredients.length < 2) {
      setError("Add at least 2 ingredients to get a recipe.");
      return;
    }

    setLoading(true);
    setRecipe(null);
    setError("");

    try {
      // 1️⃣ Find recipe by ingredients
      const response = await fetch(
        `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients.join(
          ","
        )}&number=1&apiKey=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.length === 0) {
        setRecipe({
          title: "No recipe found",
          instructions: "",
          ingredients: [],
        });
        return;
      }

      const recipeId = data[0].id;

      // 2️⃣ Get full recipe details
      const detailsRes = await fetch(
        `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${API_KEY}`
      );
      const detailsData = await detailsRes.json();

      setRecipe({
        title: detailsData.title,
        instructions:
          detailsData.instructions || "No instructions provided.",
        image: detailsData.image,
        ingredients: detailsData.extendedIngredients.map(
          (item) => item.original
        ),
      });
    } catch (err) {
      console.error(err);
      setError("Failed to fetch recipe. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <form className="formstyling" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter minimum 2 ingredient"
          name="ingredient"
        />
        <button type="submit">Add Ingredient</button>
      </form>

      {error && <p className="error">{error}</p>}

      {ingredients.length > 0 && (
        <section>
          <h2>Ingredients on hand:</h2>
          <ul className="ingredients-list" aria-live="polite">
            {ingredients.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>

          <div className="get-recipe-container">
            <h3>Ready for a recipe?</h3>
            <button
              onClick={getRecipe}
              disabled={loading || ingredients.length < 2}
            >
              {loading ? "Generating..." : "Get a recipe"}
            </button>
           
          </div>
        </section>
      )}

      {recipe && (
        <section className="recipe-section">
          <h2>{recipe.title}</h2>
          {recipe.image && <img src={recipe.image} alt={recipe.title} />}
          <h3>Ingredients:</h3>
          <ul>
            {recipe.ingredients.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <h3>Instructions:</h3>
          <p dangerouslySetInnerHTML={{ __html: recipe.instructions }}></p>
        </section>
      )}
    </main>
  );
}
