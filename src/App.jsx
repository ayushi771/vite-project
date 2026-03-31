import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Navbar from "/src/components/Navbar";
import AuthModal from "/src/components/AuthModal";
import SavedRecipes from "/src/pages/SavedRecipes";
import RecipeBuilder from "/src/components/recipe-builder/RecipeBuilder";
import RequireAuth from "/src/components/RequireAuth";
import Trash from "/src/pages/Trash";
import burgerImg from "/src/assets/burger.png";
import pizzaImg from "/src/assets/piza.png";
import cakeImg from "/src/assets/cake.png";
import downloadImg from "/src/assets/download.png";
import noodlesImg from "/src/assets/noodles.png";
import cupcakesImg from "/src/assets/cupcakes.png";
import frenchfriesImg from "/src/assets/frenchfries.png";
import breadImg from "/src/assets/bread.png";
import bbImg from "/src/assets/bb.png";
import nachosImg from "/src/assets/nachos.png";
import garlicImg from "/src/assets/garlic.png";
import tiramisuImg from "/src/assets/tiramisu.png";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const FOOD_ICONS = [
  burgerImg,
  pizzaImg,
  cakeImg,
  downloadImg,
  noodlesImg,
  cupcakesImg,
  frenchfriesImg,
  breadImg,
  bbImg,
  nachosImg,
  garlicImg,
  tiramisuImg,
];

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return;

    try {
      setUser(JSON.parse(stored));
    } catch {
      localStorage.removeItem("user");
    }
  }, []);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Main user={user} setUser={setUser} />} />

            <Route
              path="/saved-recipes"
              element={
                <RequireAuth user={user}>
                  <SavedRecipes user={user} />
                </RequireAuth>
              }
            />

            <Route
              path="/trash"
              element={
                <RequireAuth user={user}>
                  <Trash user={user} />
                </RequireAuth>
              }
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export function Main({ user, setUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [ingredients, setIngredients] = useState([]);
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recipesPool, setRecipesPool] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const suggestionsCache = useRef(new Map());
  const activeRequestController = useRef(null);
  const inputRef = useRef(null);
  const [showAuth, setShowAuth] = useState(false);
  const debounceRef = useRef(null);

  const acceptSuggestion = useCallback((value) => {
    setInputValue(value);
    setSuggestions([]);
    setSelectedIndex(-1);
  }, []);

  // hydrate top-level user into App state if localStorage exists but user prop is null
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser && !user) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (_) {
        localStorage.removeItem("user");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

   function handleLogin(userData) {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    setShowAuth(false);

    const from = location.state?.from?.pathname;
    if (from) navigate(from, { replace: true });
  }

  function handleLogout() {
    setUser(null);
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  }

  async function fetchSuggestionsRaw(query, signal) {
    if (!query) return [];
    const q = query.trim().toLowerCase();

    if (suggestionsCache.current.has(q)) {
      return suggestionsCache.current.get(q);
    }

    const url = `${API_BASE}/api/spoonacular/autocomplete?query=${encodeURIComponent(q)}`;

    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new Error("Failed to fetch suggestions");
    }
    const data = await res.json();
    const normalized = Array.isArray(data) ? data.map((d) => ({ name: String(d.name) })) : [];
    suggestionsCache.current.set(q, normalized);
    return normalized;
  }

  useEffect(() => {
    if (!inputValue) {
      setSuggestions([]);
      setSelectedIndex(-1);
      setSuggestionLoading(false);
      if (activeRequestController.current) {
        activeRequestController.current.abort();
        activeRequestController.current = null;
      }
      return;
    }

    setSuggestionLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        if (activeRequestController.current) {
          activeRequestController.current.abort();
        }
        const controller = new AbortController();
        activeRequestController.current = controller;

        const results = await fetchSuggestionsRaw(inputValue, controller.signal);
        if (controller.signal.aborted) return;

        setSuggestions(results);
        setSelectedIndex(results.length > 0 ? 0 : -1);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Autocomplete error:", err);
        }
      } finally {
        setSuggestionLoading(false);
        activeRequestController.current = null;
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue]);

  function handleInputKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedIndex((idx) => {
          const next = idx + 1 < suggestions.length ? idx + 1 : 0;
          return next;
        });
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedIndex((idx) => {
          const next = idx - 1 >= 0 ? idx - 1 : suggestions.length - 1;
          return next;
        });
      }
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        e.preventDefault();
        acceptSuggestion(suggestions[selectedIndex].name);
      }
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setSelectedIndex(-1);
    } else if (e.key === "Tab") {
      const ghost =
        (selectedIndex >= 0 && suggestions[selectedIndex]) ||
        suggestions[0] ||
        null;
      if (ghost && ghost.name && ghost.name.toLowerCase().startsWith(inputValue.toLowerCase())) {
        e.preventDefault();
        acceptSuggestion(ghost.name);
      }
    }
  }

  function handleSuggestionClick(idx) {
    const selected = suggestions[idx];
    if (!selected) return;
    const name = selected.name;
    setIngredients((prev) => {
      if (prev.includes(name)) return prev;
      return [...prev, name];
    });
    setInputValue("");
    setSuggestions([]);
    setSelectedIndex(-1);
    setError("");
    inputRef.current?.focus();
  }

  function renderHighlightedSuggestion(suggestion) {
    const s = suggestion.name;
    const q = inputValue || "";
    const idx = s.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1 || !q) return s;
    return (
      <>
        {s.slice(0, idx)}
        <strong>{s.slice(idx, idx + q.length)}</strong>
        {s.slice(idx + q.length)}
      </>
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newIngredient = (formData.get("ingredient") || "").trim().toLowerCase();

    if (!newIngredient) {
      setError("Please enter an ingredient.");
    } else if (ingredients.includes(newIngredient)) {
      setError("Ingredient already added.");
    } else {
      setIngredients((prev) => [...prev, newIngredient]);
      event.currentTarget.reset();
      setInputValue("");
      setSuggestions([]);
      setSelectedIndex(-1);
      setError("");

      (async () => {
        try {
          await fetch(`${API_BASE}/api/ingredients`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newIngredient }),
          });
        } catch (err) {
          console.warn("Failed to persist ingredient:", err);
        }
      })();
    }
  }

  async function fetchRecipeDetailsFromBackend(recipeId) {
    const detailsRes = await fetch(`${API_BASE}/api/spoonacular/recipes/${recipeId}`);

    if (!detailsRes.ok) {
      throw new Error("Failed to fetch recipe details from backend");
    }

    const detailsData = await detailsRes.json();

    const saveRes = await fetch(`${API_BASE}/api/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spoonacular_id: detailsData.spoonacular_id || detailsData.id,
        title: detailsData.title,
        image: detailsData.image,
        instructions: detailsData.instructions,
        ingredients: Array.isArray(detailsData.ingredients) ? detailsData.ingredients : [],
      }),
    });

    const savedRecipe = await saveRes.json();

    setRecipe({
      id: savedRecipe.id,
      spoonacular_id: savedRecipe.spoonacular_id,
      title: savedRecipe.title,
      instructions: savedRecipe.instructions || "No instructions provided.",
      image: savedRecipe.image,
      ingredients: savedRecipe.ingredients || [],
    });
  }

  async function getRecipe() {
    if (ingredients.length < 2) {
      setError("Add at least 2 ingredients to get a recipe.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const q = ingredients.map((i) => encodeURIComponent(i)).join(",");
      const response = await fetch(`${API_BASE}/api/spoonacular/findByIngredients?ingredients=${q}&number=10`);
      if (!response.ok) {
        throw new Error("Failed to fetch recipes");
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

      setRecipesPool(data);
      const randomIndex = Math.floor(Math.random() * data.length);
      setCurrentIndex(randomIndex);

      await fetchRecipeDetailsFromBackend(data[randomIndex].id || data[randomIndex].spoonacularId || data[randomIndex].spoonacular_id);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch recipe. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  async function removeIngredient(nameToRemove) {
    setIngredients((prev) => prev.filter((ing) => ing !== nameToRemove));
  }

  async function regenerateRecipe() {
    if (recipesPool.length === 0) return;

    setLoading(true);

    try {
      let newIndex;

      do {
        newIndex = Math.floor(Math.random() * recipesPool.length);
      } while (newIndex === currentIndex && recipesPool.length > 1);

      setCurrentIndex(newIndex);

      await fetchRecipeDetailsFromBackend(recipesPool[newIndex].id || recipesPool[newIndex].spoonacularId || recipesPool[newIndex].spoonacular_id);
    } catch (err) {
      console.error(err);
      setError("Failed to regenerate recipe.");
    } finally {
      setLoading(false);
    }
  }

  const ghostText =
    inputValue &&
    suggestions.length > 0 &&
    suggestions[0].name.toLowerCase().startsWith(inputValue.toLowerCase())
      ? suggestions[0].name
      : "";

  return (
      <main>
      <Navbar user={user} onLoginClick={() => setShowAuth(true)} onLogout={handleLogout} />

      {/* RecipeBuilder handles gating: if not logged in it calls openLogin() */}
      <RecipeBuilder user={user} openLogin={() => setShowAuth(true)} />

      <AuthModal show={showAuth} onClose={() => setShowAuth(false)} onLoginSuccess={handleLogin} />
    </main>
  );
}