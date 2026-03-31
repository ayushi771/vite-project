// src/api/recipeApi.js
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

// Generic response handler
async function handleResponse(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.detail || json.message || "Request failed");
  return json;
}

// Saved & Trash recipes
export async function getSavedRecipes(userId) {
  const res = await fetch(`${API_BASE}/saved-recipes?user_id=${userId}`);
  return handleResponse(res);
}

export async function getTrashRecipes(userId) {
  const res = await fetch(`${API_BASE}/trash?user_id=${userId}`);
  return handleResponse(res);
}

// Recipe actions
export async function deleteRecipe(id) {
  const res = await fetch(`${API_BASE}/delete-recipe/${id}`, { method: "PUT" });
  return handleResponse(res);
}

export async function restoreRecipe(id) {
  const res = await fetch(`${API_BASE}/restore-recipe/${id}`, { method: "PUT" });
  return handleResponse(res);
}

export async function deletePermanent(id) {
  const res = await fetch(`${API_BASE}/delete-permanently/${id}`, { method: "DELETE" });
  return handleResponse(res);
}

// Recipe details with fallback
export async function getRecipeDetails(recipe_id) {
  let res = await fetch(`${API_BASE}/recipes/${recipe_id}`);
  if (res.ok) return handleResponse(res);

  // Fallback to Spoonacular proxy
  res = await fetch(`${API_BASE}/spoonacular/recipes/${recipe_id}`);
  return handleResponse(res);
}

export async function searchRecipes(filters = {}) {
  const params = new URLSearchParams();

  if (Array.isArray(filters.ingredients)) {
    params.set("ingredients", filters.ingredients.join(","));
  } else if (filters.ingredients) {
    params.set("ingredients", filters.ingredients);
  }
  if (filters.cuisine) params.set("cuisine", filters.cuisine);
  if (filters.diet) params.set("diet", filters.diet);
  if (filters.meal_type) params.set("meal_type", filters.meal_type);
  if (filters.max_calories) params.set("max_calories", String(filters.max_calories));
  if (filters.number) params.set("number", String(filters.number));

  const res = await fetch(`${API_BASE}/spoonacular/search?${params.toString()}`);
  return handleResponse(res);
}

// Autocomplete ingredients
export async function autocompleteIngredient(q) {
  if (!q) return [];
  const res = await fetch(`${API_BASE}/spoonacular/autocomplete?query=${encodeURIComponent(q)}`);
  return handleResponse(res);
}