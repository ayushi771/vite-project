// ================================
// src/services/api.js (UNIFIED PRODUCTION)
// ================================

// Always prefer env, fallback to deployed backend (never localhost in prod)
const API_ORIGIN =
  import.meta.env.VITE_API_URL || // e.g. "https://vite-project-1-gq4u.onrender.com"
  "http://localhost:8000";

const BASE_URL = `${API_ORIGIN}/api`;
console.log("API URL:", BASE_URL);
// ================================
// UNIFIED RESPONSE HANDLER
// ================================
async function handleResponse(res) {
  let json = null;

  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const message =
      json?.detail ||
      json?.message ||
      json?.error ||
      `Error ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = json;
    throw err;
  }

  return json ?? {};
}

// ================================
// AUTH ENDPOINTS
// ================================

export async function registerUser(name, email, password) {
  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse(res);
}

export async function loginUser(email, password) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse(res);
  if (data?.user_id) {
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: data.user_id,
        name: data.name,
        email: data.email,
      })
    );
  }
  return data;
}

export async function forgotPassword(email) {
  const res = await fetch(
    `${BASE_URL}/forgot-password?email=${encodeURIComponent(email)}`,
    { method: "POST" }
  );
  return handleResponse(res);
}

export async function resetPassword(token, newPassword) {
  const res = await fetch(`${BASE_URL}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  return handleResponse(res);
}

// ================================
// USER HELPERS
// ================================
export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

export function logoutUser() {
  localStorage.removeItem("user");
}

// ================================
// RECIPE MANAGEMENT
// ================================
export async function saveRecipe(userId, recipe) {
  const res = await fetch(`${BASE_URL}/save_recipe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      recipe_id: recipe?.id,
      recipe_title: recipe?.title,
      recipe_image: recipe?.image,
    }),
  });
  return handleResponse(res);
}

export async function getSavedRecipes(userId) {
  if (!userId) throw new Error("Missing user_id");
  const res = await fetch(`${BASE_URL}/saved-recipes?user_id=${userId}`);
  return handleResponse(res);
}

export async function getTrashRecipes(userId) {
  if (!userId) throw new Error("Missing user_id");
  const res = await fetch(`${BASE_URL}/trash?user_id=${userId}`);
  return handleResponse(res);
}

export async function deleteRecipe(id) {
  if (!id) throw new Error("Missing recipe id");
  const res = await fetch(`${BASE_URL}/delete-recipe/${id}`, { method: "PUT" });
  return handleResponse(res);
}

export async function restoreRecipe(id) {
  if (!id) throw new Error("Missing recipe id");
  const res = await fetch(`${BASE_URL}/restore-recipe/${id}`, { method: "PUT" });
  return handleResponse(res);
}

export async function deletePermanent(id) {
  if (!id) throw new Error("Missing recipe id");
  const res = await fetch(`${BASE_URL}/delete-permanently/${id}`, {
    method: "DELETE",
  });
  return handleResponse(res);
}

// ================================
// RECIPE DETAILS (with fallback)
// ================================
export async function getRecipeDetails(recipeId) {
  if (!recipeId) throw new Error("Missing recipe_id");

  // Try as local saved recipe (custom table logic, supports both)
  let res = await fetch(`${BASE_URL}/recipes/${recipeId}`);
  if (res.ok) return handleResponse(res);

  // Fallback to Spoonacular proxy endpoint
  res = await fetch(`${BASE_URL}/spoonacular/recipes/${recipeId}`);
  if (res.ok) return handleResponse(res);

  throw new Error("Failed to fetch recipe details");
}

// ================================
// SPOONACULAR APIS
// ================================

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

  const res = await fetch(`${BASE_URL}/spoonacular/search?${params.toString()}`);
  return handleResponse(res);
}

export async function autocompleteIngredients(query) {
  if (!query) return [];
  const res = await fetch(`${BASE_URL}/spoonacular/autocomplete?query=${encodeURIComponent(query)}`);
  return handleResponse(res);
}
export const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}