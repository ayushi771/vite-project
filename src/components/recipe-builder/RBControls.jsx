import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * RBControls — clean version
 * - No floating emoji icons.
 * - No hero pan/illustration image. Spacing preserved with an invisible
 *   spacer that has the same footprint, so the layout doesn't shift.
 * - Refined, fully-tested responsive media queries from 1280px down to 320px.
 */

const DIET_OPTIONS = [
  { value: "", label: "Any" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "ketogenic", label: "Keto" },
];

const MEAL_OPTIONS = [
  { value: "", label: "Any", emoji: "✨" },
  { value: "breakfast", label: "Breakfast", emoji: "🥐" },
  { value: "lunch", label: "Lunch", emoji: "🥪" },
  { value: "dinner", label: "Dinner", emoji: "🍲" },
];

const CUISINES = [
  "", "american", "british", "chinese", "french", "italian",
  "indian", "mexican", "thai", "japanese", "mediterranean",
];

/* ---------------------------
   Swipe letters button
---------------------------- */
function SwipeButton({ text = "Search Recipes", disabled, onClick }) {
  const letters = String(text).split("");

  const container = {
    rest: { transition: { staggerChildren: 0 } },
    hover: { transition: { staggerChildren: 0.035 } },
  };
  const baseLetter = {
    rest: { y: "0%" },
    hover: { y: "-110%", transition: { duration: 0.25, ease: "easeOut" } },
  };
  const hoverLetter = {
    rest: { y: "110%" },
    hover: { y: "0%", transition: { duration: 0.25, ease: "easeOut" } },
  };

  return (
    <motion.button
      type="button"
      className="btn-primary swipe-btn"
      onClick={onClick}
      disabled={disabled}
      initial="rest"
      whileHover={disabled ? "rest" : "hover"}
      animate="rest"
      variants={container}
    >
      <span className="swipe-btn-inner" aria-hidden="true">
        {letters.map((char, i) => {
          const ch = char === " " ? "\u00A0" : char;
          return (
            <span key={i} className="swipe-letter-clip">
              <motion.span className="swipe-letter" variants={baseLetter}>{ch}</motion.span>
              <motion.span className="swipe-letter swipe-letter-hover" variants={hoverLetter}>{ch}</motion.span>
            </span>
          );
        })}
      </span>
      <span className="sr-only">{text}</span>
    </motion.button>
  );
}

/* ---------------------------
   Main
---------------------------- */
export default function RBControls(props) {
  const {
    ingredientInput, setIngredientInput, addIngredient,
    suggestions, ingredients, removeIngredient,
    cuisine, setCuisine, diet, setDiet,
    mealType, setMealType,
    maxCalories, setMaxCalories,
    number, setNumber,
    doSearch, resetAll, loading, primarySearchLabel,
  } = props;

  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];
  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];

  const [isTiny, setIsTiny] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 600 : false
  );

  useEffect(() => {
    const onResize = () => setIsTiny(window.innerWidth <= 600);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const inputRef = useRef(null);
  const [suggestionStyle, setSuggestionStyle] = useState({});

  const updateSuggestionPosition = useCallback(() => {
    const inp = inputRef.current;
    if (!inp) { setSuggestionStyle({}); return; }
    const rect = inp.getBoundingClientRect();
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);

    if (isTiny) {
      const m = 12;
      setSuggestionStyle({
        position: "fixed",
        left: `${m}px`, right: `${m}px`,
        top: `${rect.bottom + 8}px`,
        width: `calc(100% - ${m * 2}px)`,
        maxWidth: "640px", maxHeight: "55vh", zIndex: 2200,
      });
      return;
    }
    const left = Math.max(8, rect.left);
    const width = Math.min(rect.width, vw - left - 12);
    setSuggestionStyle({
      position: "fixed",
      left: `${left}px`, top: `${rect.bottom + 8}px`,
      width: `${width}px`, maxHeight: "45vh", zIndex: 2200,
    });
  }, [isTiny]);

  useEffect(() => { updateSuggestionPosition(); },
    [updateSuggestionPosition, ingredientInput, safeSuggestions.length]);

  useEffect(() => {
    const onScroll = () => updateSuggestionPosition();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateSuggestionPosition);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateSuggestionPosition);
    };
  }, [updateSuggestionPosition]);

  const onAdd = useCallback((value) => {
    const v = (value || ingredientInput || "").trim();
    if (!v) return;
    if (typeof addIngredient === "function") addIngredient(v);
    if (typeof setIngredientInput === "function") setIngredientInput("");
  }, [addIngredient, ingredientInput, setIngredientInput]);

  const onClear = useCallback(() => {
    if (typeof setIngredientInput === "function") setIngredientInput("");
  }, [setIngredientInput]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") { e.preventDefault(); onAdd(); }
    else if (e.key === "Escape") { onClear(); }
  }, [onAdd, onClear]);

  const highlight = (text = "") => {
  const str = String(text ?? "");
  const q = ingredientInput || "";
  if (!q) return str;
  const idx = str.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return str;
  return (
    <>
      {str.slice(0, idx)}
      <strong style={{ color: "#ff5e8a" }}>{str.slice(idx, idx + q.length)}</strong>
      {str.slice(idx + q.length)}
    </>
  );
};


  const pastelFromString = (str = "") => {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return `hsl(${Math.abs(h) % 360} 70% 82%)`;
  };

  const css = `
  :root{
    --card-radius:20px;
    --soft-shadow: 0 20px 50px rgba(20,20,40,0.06);
    --accent-1: #ff7aa2;
    --accent-2: #ffb07a;
    --muted: #8f9499;
  }

  .rb-controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 380px;
    gap: 28px;
    width: 100%;
    box-sizing: border-box;
    align-items: start;
  }

  .rb-hero {
    background: linear-gradient(135deg, #fff7f7 0%, #fff9f2 35%, #fff5ff 100%);
    border-radius: var(--card-radius);
    padding: 28px;
    position: relative;
    box-shadow: var(--soft-shadow);
    overflow: visible;
    min-width: 0;
  }

  .hero-head {
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap: 16px;
    margin-bottom: 18px;
  }
  .hero-left { min-width: 0; }
  .hero-left h2 { margin:0; font-size:32px; line-height:1.1; color:#141416; font-weight:800; }
  .hero-left p  { margin:6px 0 0; color:var(--muted); font-size:14px; }

  /* Invisible spacer — preserves the original right-side footprint
     where the illustration used to be, so spacing doesn't shift. */
  .hero-spacer {
    width: 220px;
    height: 105px;
    flex-shrink: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .ingredients-card {
    margin-top: 8px;
    border-radius:14px;
    background:#fff;
    padding:14px;
    box-shadow: 0 8px 30px rgba(20,20,40,0.04);
    display:flex;
    align-items:center;
    gap:14px;
    border:1px solid rgba(20,20,40,0.03);
  }
  .ing-left { flex:1; display:flex; flex-direction:column; gap:8px; min-width:0; }
  .ing-title { font-weight:700; font-size:15px; color:#222; }
  .ing-sub   { font-size:13px; color:var(--muted); }

  .input-row { display:flex; gap:10px; align-items:center; margin-top:8px; width:100%; }

  .input-row .input-field {
    flex:1;
    display:flex;
    align-items:center;
    gap:8px;
    padding:12px 14px;
    border-radius:12px;
    background:#fff;
    border:1px solid rgba(20,20,40,0.06);
    min-width:0;
    transition: border-color 160ms ease, box-shadow 160ms ease;
  }
  .input-row .input-field:focus-within{
    border-color: rgba(255,122,162,0.45);
    box-shadow: 0 0 0 4px rgba(255,122,162,0.10);
  }
  .input-field input { border:0; outline:0; flex:1; font-size:14px; background:transparent; min-width:0; }

  .add-floating {
    width:52px; height:52px; flex-shrink:0;
    border-radius:12px;
    background: linear-gradient(90deg,var(--accent-1), var(--accent-2));
    color:#fff; border:none; font-size:24px;
    display:inline-flex; align-items:center; justify-content:center;
    cursor:pointer;
    box-shadow: 0 12px 28px rgba(255,122,162,0.20);
    transition: transform 160ms ease, box-shadow 160ms ease;
  }
  .add-floating:hover{ transform: translateY(-1px); box-shadow: 0 16px 36px rgba(255,122,162,0.28); }

  .rb-chips { margin-top:12px; display:flex; gap:10px; flex-wrap:wrap; }
  .chip { padding:8px 12px; border-radius:999px; background:#fff;
          border:1px solid rgba(20,20,40,0.05); box-shadow: 0 6px 12px rgba(20,20,40,0.02);
          font-size:13px; color:#222; display:inline-flex; align-items:center; gap:10px; cursor:pointer; }
  .chip .x { opacity:0.6; font-weight:700; }
  .chip-dot { width:10px; height:10px; border-radius:999px; display:inline-block; }

  .popular-row { display:flex; align-items:center; gap:10px; margin-top:14px; font-size:13px; color:var(--muted); flex-wrap:wrap; }
  .popular-pill { background:#fff; border-radius:999px; padding:6px 10px; border:1px solid rgba(20,20,40,0.05); font-size:13px; cursor:pointer; }

  .rb-suggestions { background:#fff; border-radius:14px; box-shadow: 0 18px 40px rgba(10,10,20,0.10); padding:6px; overflow:auto; border:1px solid rgba(20,20,40,0.05); }
  .rb-suggestions [role="option"] { padding:12px 14px; cursor:pointer; border-radius:10px; font-size:14px; }
  .rb-suggestions [role="option"]:hover { background:#fff5f8; }

  .rb-filters { background:#fff; border-radius: var(--card-radius); padding:18px; box-shadow: var(--soft-shadow); border:1px solid rgba(20,20,40,0.03); min-width:0; }
  .filters-title { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
  .filters-title h3 { margin:0; font-size:16px; font-weight:700; }
  .filters-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
  .filters-grid label { display:flex; flex-direction:column; gap:6px; font-size:12px; color:var(--muted); font-weight:600; text-transform:uppercase; letter-spacing:0.04em; }
  .filters-grid select { width:100%; padding:11px 12px; border-radius:10px; border:1px solid rgba(20,20,40,0.06); background:#fafafa; font-size:14px; color:#222; }

  .meal-row { display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap; }
  .meal-btn { padding:8px 12px; border-radius:12px; border:1px solid rgba(20,20,40,0.06); background:#fff; cursor:pointer; font-size:13px; display:inline-flex; align-items:center; gap:6px; }
  .meal-btn.active { background:linear-gradient(90deg,var(--accent-1),var(--accent-2)); color:#fff; border:none; box-shadow: 0 10px 28px rgba(255,122,162,0.18); }

  .slider-row { margin-bottom:12px; }
  input[type=range] { -webkit-appearance:none; appearance:none; width:100%; height:8px; background: linear-gradient(90deg,#ffe6f0 0%, #f1e9ff 100%); border-radius:8px; outline:none; }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px; border-radius:50%; background: linear-gradient(90deg,var(--accent-1),var(--accent-2)); border:3px solid #fff; box-shadow: 0 8px 20px rgba(255,122,162,0.20); cursor:pointer; }
  .number-input input { width:100%; padding:10px 12px; border-radius:10px; border:1px solid rgba(20,20,40,0.06); background:#fafafa; }

  .actions-row { display:flex; gap:12px; margin-top:12px; }

  .btn-primary {
    background: linear-gradient(90deg,var(--accent-1),var(--accent-2));
    color:#fff; border:none; padding:12px 16px; border-radius:12px;
    cursor:pointer; font-weight:800; flex:1;
    box-shadow: 0 12px 28px rgba(255,122,162,0.18);
    transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
  }
  .btn-primary:hover{ transform: translateY(-1px); box-shadow: 0 16px 36px rgba(255,122,162,0.26); filter: saturate(1.05); }
  .btn-primary:active{ transform: translateY(0); }
  .btn-ghost { background:#fff; border:1px solid rgba(20,20,40,0.06); padding:12px 16px; border-radius:12px; cursor:pointer; flex:1; }

  .swipe-btn { position: relative; overflow: hidden; display:inline-flex; justify-content:center; align-items:center; }
  .swipe-btn:disabled { opacity: 0.65; cursor: not-allowed; }
  .swipe-btn-inner { display: inline-flex; }
  .swipe-letter-clip{ position: relative; display: inline-block; overflow: hidden; line-height: 1.1; }
  .swipe-letter{ display:inline-block; will-change: transform; }
  .swipe-letter-hover{ position:absolute; left:0; top:0; }

  .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }

  /* ============== RESPONSIVE ============== */

  @media (max-width: 1280px) {
    .rb-controls { grid-template-columns: minmax(0, 1fr) 360px; gap: 24px; }
  }

  @media (max-width: 1100px) {
    .rb-controls { grid-template-columns: minmax(0, 1fr) 320px; gap: 20px; }
    .hero-left h2 { font-size: 28px; }
    .hero-spacer  { width: 180px; height: 96px; }
  }

  @media (max-width: 960px) {
    .rb-controls { grid-template-columns: 1fr; gap: 18px; }
    .rb-filters  { width: 100%; }
    .hero-spacer { width: 140px; height: 84px; }
  }

  @media (max-width: 768px) {
    .rb-hero { padding: 22px; }
    .hero-left h2 { font-size: 24px; }
    .hero-spacer  { width: 120px; height: 72px; }
    .filters-grid { grid-template-columns: 1fr 1fr; }
  }

  @media (max-width: 600px) {
    .rb-controls { gap: 14px; }
    .rb-hero     { padding: 18px; border-radius: 18px; }

    .hero-head   { flex-direction: column; align-items: stretch; gap: 10px; margin-bottom: 14px; }
    .hero-spacer { display: none; }

    .hero-left h2 { font-size: 22px; }
    .hero-left p  { font-size: 13px; }

    .ingredients-card { padding: 14px; gap: 10px; }
    .ing-title { font-size: 14px; }
    .ing-sub   { font-size: 12px; }

    .input-row { gap: 8px; }
    .input-row .input-field { padding: 12px 14px; }
    .input-field input { font-size: 16px; } /* prevents iOS zoom */
    .add-floating { width: 48px; height: 48px; font-size: 22px; }

    .rb-filters   { padding: 16px; border-radius: 16px; }
    .filters-grid { grid-template-columns: 1fr; gap: 10px; }
    .filters-grid select { padding: 12px 14px; font-size: 16px; }

    .meal-row { display:grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .meal-btn { justify-content:center; padding: 10px 8px; font-size: 13px; }

    .actions-row { flex-direction: column; gap: 8px; }
    .btn-primary, .btn-ghost { width: 100%; padding: 12px; font-size: 14px; }

    .rb-suggestions { border-radius: 14px; }
    .rb-suggestions [role="option"] { padding: 14px; font-size: 15px; }
  }

  @media (max-width: 400px) {
    .rb-hero     { padding: 16px; }
    .hero-left h2 { font-size: 20px; }
    .hero-left p  { font-size: 12px; }

    .ingredients-card { padding: 12px; }
    .input-row .input-field { padding: 10px 12px; }
    .add-floating { width: 44px; height: 44px; font-size: 20px; border-radius: 10px; }

    .chip, .popular-pill { font-size: 12px; padding: 6px 10px; }
    .meal-btn { font-size: 12px; padding: 9px 6px; }

    .rb-filters { padding: 14px; }
  }

  @media (max-width: 340px) {
    .rb-controls { gap: 12px; }
    .rb-hero, .rb-filters { padding: 14px; border-radius: 14px; }
    .hero-left h2 { font-size: 18px; }
    .add-floating { width: 42px; height: 42px; font-size: 18px; }
    .meal-row { grid-template-columns: 1fr; }
  }
  `;

  return (
    <div className="rb-controls">
      <style>{css}</style>

      {/* LEFT: hero + ingredients */}
      <div className="rb-hero">
        <div className="hero-head">
          <div className="hero-left">
            <h2>What's in your kitchen?</h2>
            <p>Add a few ingredients and we'll cook up ideas.</p>
          </div>
          {/* Invisible spacer keeps the original layout footprint */}
          <div className="hero-spacer" aria-hidden="true" />
        </div>

        <div className="ingredients-card">
          <div className="ing-left">
            <div className="ing-title">Ingredients</div>
            <div className="ing-sub">Type and press + or Enter</div>

            <div className="input-row">
              <div className="input-field">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="e.g. tomato, basil, garlic"
                  value={ingredientInput || ""}
                  onChange={(e) => setIngredientInput && setIngredientInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              <button
                type="button"
                className="add-floating"
                onClick={() => onAdd()}
                aria-label="Add ingredient"
              >
                +
              </button>
            </div>

            {safeIngredients.length > 0 && (
  <div className="rb-chips">
    {safeIngredients.map((ing, index) => (
      <span key={ing} className="chip">
        
        <span
          className="chip-dot"
          style={{ background: pastelFromString(ing) }}
        />

        <span className="chip-text">{ing}</span>

        {/* ✅ REMOVE BUTTON */}
        <span
          className="x"
          onClick={(e) => {
            e.stopPropagation();
            removeIngredient && removeIngredient(index); // ✅ FIXED
          }}
        >
          ×
        </span>

      </span>
    ))}
  </div>
)}

            <div className="popular-row">
              <span>Popular:</span>
              {["cheese", "tomato", "rice", "egg"].map((p) => (
                <span key={p} className="popular-pill" onClick={() => onAdd(p)}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        {ingredientInput && safeSuggestions.length > 0 && (
          <div className="rb-suggestions" role="listbox" style={suggestionStyle}>
            {safeSuggestions.map((s, i) => {
  const label = typeof s === "string" ? s : (s?.name ?? s?.label ?? String(s));
  return (
    <div key={`${label}-${i}`} role="option" onClick={() => onAdd(label)}>
      {highlight(label)}
    </div>
  );
})}

          </div>
        )}
      </div>

      {/* RIGHT: filters */}
      <aside className="rb-filters">
        <div className="filters-title">
          <h3>Filters</h3>
        </div>

        <div className="filters-grid">
          <label>
            Cuisine
            <select value={cuisine || ""} onChange={(e) => setCuisine && setCuisine(e.target.value)}>
              {CUISINES.map((c) => (
                <option key={c} value={c}>{c ? c[0].toUpperCase() + c.slice(1) : "Any"}</option>
              ))}
            </select>
          </label>
          <label>
            Diet
            <select value={diet || ""} onChange={(e) => setDiet && setDiet(e.target.value)}>
              {DIET_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="meal-row">
          {MEAL_OPTIONS.map((m) => (
            <button
              key={m.value}
              type="button"
              className={`meal-btn ${mealType === m.value ? "active" : ""}`}
              onClick={() => setMealType && setMealType(m.value)}
            >
              <span>{m.emoji}</span> {m.label}
            </button>
          ))}
        </div>

        <div className="slider-row">
          <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Max calories: {maxCalories || 800}
          </label>
          <input
            type="range"
            min="100"
            max="2000"
            step="50"
            value={maxCalories || 800}
            onChange={(e) => setMaxCalories && setMaxCalories(Number(e.target.value))}
          />
        </div>

        <div className="number-input" style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>
            number of recipes
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={number || 8}
            onChange={(e) => setNumber && setNumber(Number(e.target.value))}
          />
        </div>

        <div className="actions-row">
          <SwipeButton
            text={primarySearchLabel || "Search Recipes"}
            disabled={loading}
            onClick={doSearch}
          />
          <button type="button" className="btn-ghost" onClick={resetAll}>
            Reset
          </button>
        </div>
      </aside>
    </div>
  );
}
