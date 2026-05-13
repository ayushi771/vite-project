// ================================
// src/services/api.js
// ================================

// ✅ Use Render/Vercel env var in production, fallback to localhost for dev
const API_ORIGIN = import.meta.env.VITE_API_URL || "http://localhost:8000";
const BASE_URL = `${API_ORIGIN}/api`;

/**
 * ✅ Common response handler (FETCH-safe)
 * - Works for JSON + empty responses
 * - Throws an Error with extra fields: err.status, err.data
 * - Prevents weird runtime issues and makes UI error mapping easy
 */
async function handleResponse(res) {
  let json = null;

  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const message =
      (json && (json.detail || json.message || json.error)) ||
      `Request failed (${res.status})`;

    const err = new Error(String(message));
    err.status = res.status;
    err.data = json;
    throw err;
  }

  return json ?? {};
}

// ✅ REGISTER USER
export async function registerUser(name, email, password) {
  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  return handleResponse(res);
}

// ✅ LOGIN USER
export async function loginUser(email, password) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return handleResponse(res);
}

// ✅ VERIFY EMAIL CODE
export async function verifyEmailCode(email, code) {
  const res = await fetch(`${BASE_URL}/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

  return handleResponse(res);
}

// ✅ FORGOT PASSWORD
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

// ✅ OLD VERIFY LINK FLOW (optional)
export async function verifyEmail(token) {
  const res = await fetch(`${BASE_URL}/verify?token=${encodeURIComponent(token)}`);
  return handleResponse(res);
}

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