const BASE_URL = "http://localhost:8000/api";

async function handleResponse(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // throw with useful message so caller can catch
    const err = json.detail || json.message || json.error || "Request failed";
    throw new Error(err);
  }
  return json;
}

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
  return handleResponse(res);
}

export async function saveRecipe(userId, recipe) {
  const res = await fetch(`${BASE_URL}/save_recipe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      recipe_id:recipe.id,
      recipe_title: recipe.title,
    }),
  });

  const data = await res.json();
  console.log("Backend response:", data);

  return data;
}