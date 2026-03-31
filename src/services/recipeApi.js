const API = "http://localhost:8000/api"

export async function getSavedRecipes(userId) {
  const res = await fetch(`${API}/saved-recipes?user_id=${userId}`)
  return res.json()
}

export async function getTrashRecipes(userId) {
  const res = await fetch(`${API}/trash?user_id=${userId}`)
  return res.json()
}

export async function deleteRecipe(id) {
  await fetch(`${API}/delete-recipe/${id}`, { method: "PUT" })
}

export async function restoreRecipe(id) {
  await fetch(`${API}/restore-recipe/${id}`, { method: "PUT" })
}

export async function deletePermanent(id) {
  await fetch(`${API}/delete-permanently/${id}`, { method: "DELETE" })
}
export async function getRecipeDetails(recipe_id) {
  // Try local saved recipe (your recipes table)
  let res = await fetch(`${API}/recipes/${recipe_id}`);
  if (res.ok) return res.json();

  // If local not found, fall back to spoonacular proxy endpoint
  res = await fetch(`${API}/spoonacular/recipes/${recipe_id}`);
  if (res.ok) return res.json();

  throw new Error("Failed to fetch recipe details");
}