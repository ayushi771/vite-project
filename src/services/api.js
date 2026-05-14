// ================================
// src/services/api.js (FINAL CLEAN)
// ================================

// ✅ Always prefer env, fallback to deployed backend (NOT localhost)
const API_ORIGIN =
  import.meta.env.VITE_API_URL ||
  "https://vite-project-1-gq4u.onrender.com";

const BASE_URL = `${API_ORIGIN}/api`;

// ================================
// COMMON RESPONSE HANDLER
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
      json?.detail || json?.message || json?.error || `Error ${res.status}`;

    const err = new Error(message);
    err.status = res.status;
    err.data = json;
    throw err;
  }

  return json ?? {};
}

// ================================
// AUTH APIs
// ================================

// ✅ REGISTER
export async function registerUser(name, email, password) {
  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  return handleResponse(res);
}

// ✅ LOGIN
export async function loginUser(email, password) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await handleResponse(res);

  // ✅ store user automatically (IMPORTANT)
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

// ✅ FORGOT PASSWORD (returns reset token)
export async function forgotPassword(email) {
  const res = await fetch(
    `${BASE_URL}/forgot-password?email=${encodeURIComponent(email)}`,
    { method: "POST" }
  );

  return handleResponse(res);
}

// ✅ RESET PASSWORD
export async function resetPassword(token, newPassword) {
  const res = await fetch(`${BASE_URL}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      new_password: newPassword,
    }),
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
// RECIPES APIs
// ================================

// ✅ SAVE RECIPE
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

// ✅ GET SAVED RECIPES (FIXED)
export async function getSavedRecipes(userId) {
  if (!userId) throw new Error("Missing user_id");

  const res = await fetch(
    `${BASE_URL}/saved-recipes?user_id=${userId}`
  );

  return handleResponse(res);
}

// ✅ TRASH RECIPES
export async function getTrashRecipes(userId) {
  const res = await fetch(`${BASE_URL}/trash?user_id=${userId}`);
  return handleResponse(res);
}

// ================================
// SPOONACULAR APIs
// ================================

// ✅ SEARCH RECIPES
export async function searchRecipes(params = {}) {
  const query = new URLSearchParams(params).toString();

  const res = await fetch(`${BASE_URL}/spoonacular/search?${query}`);
  return handleResponse(res);
}

// ✅ AUTOCOMPLETE
export async function autocompleteIngredients(query) {
  const res = await fetch(
    `${BASE_URL}/spoonacular/autocomplete?query=${encodeURIComponent(query)}`
  );

  return handleResponse(res);
}

// ✅ GET RECIPE DETAILS
export async function getRecipeDetails(id) {
  const res = await fetch(`${BASE_URL}/spoonacular/recipes/${id}`);
  return handleResponse(res);
}