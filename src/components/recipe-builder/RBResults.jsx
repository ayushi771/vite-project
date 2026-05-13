import React, { useState } from "react";
function getServings(r) {
  if (!r) return null;

  // common API fields
  const candidates = [
    r.servings,
    r.serving,
    r.yield,
    r.portions,
    r.numberOfServings,
  ];

  for (const c of candidates) {
    const n = parseNumber(c);
    if (n != null) return n;
  }

  return null;
}

export default function RBResults({
  results = [],
  loading = false,
  onOpen = () => {},
}) {
  const [liked, setLiked] = useState({});
  const gradients = [
    "linear-gradient(200deg, #ffffff 60%, #ffe4e6 100%)",
    "linear-gradient(200deg, #ffffff 60%, #ecfeff 100%)",
    "linear-gradient(200deg, #ffffff 60%, #dcfce7 100%)",
    "linear-gradient(200deg, #ffffff 60%, #fef9c3 100%)",
    "linear-gradient(200deg, #ffffff 60%, #fce7f3 100%)",
    "linear-gradient(200deg, #ffffff 60%, #e0f2fe 100%)",
  ];

  const toggleLike = (id, e) => {
    e.stopPropagation();
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <section className="rb-results">
        <div className="results-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rb-card skeleton">
              <div className="skeleton-img" />
              <div className="skeleton-body">
                <div className="skeleton-line short" />
                <div className="skeleton-line" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!loading && results.length === 0) {
    return (
      <section className="rb-results">
        <div className="rb-empty">
          <div className="rb-empty-emoji">🧑‍🍳</div>
          <h3>Ready to cook?</h3>
          <p>
            Add ingredients & hit <b>Find Recipes</b> to discover tasty dishes!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rb-results">
      <h3 className="rb-count" style={{ paddingBottom: "20px" }}>
         Found <span>{results.length}</span> recipes
      </h3>

      <div className="results-grid">
        {results.map((r, i) => {
          const caloriesValue = getCalories(r);
          const caloriesDisplay = caloriesValue != null ? Math.round(caloriesValue) : "—";

          const readyValue = getReadyInMinutes(r);
          const readyDisplay = readyValue != null ? readyValue : "—";

          return (
           <article
  key={r.id ?? i}
  className="rb-card"
  style={{
    animationDelay: `${i * 70}ms`,
    background: gradients[i % gradients.length],
  }}
>
  <div
    className="rb-clickable"
    onClick={() => onOpen(r)}
  >
    <div className="rb-img">
      {r.image ? (
        <img src={r.image} alt={r.title} loading="lazy" />
      ) : (
        <div className="skeleton-img" />
      )}
    </div>

    <h4 className="rb-title">{r.title}</h4>

    <div className="rb-meta">
      <span>🔥 {caloriesDisplay} kcal</span>
    </div>
  </div>

  <button
    type="button"
    className="rb-btn"
    onClick={() => onOpen(r)}
  >
    View Recipe →
  </button>
</article>
         
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Helpers ---------- */

function parseNumber(val) {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    // match first number (integer or decimal)
    const m = val.match(/(\d+(\.\d+)?)/);
    if (m) return Number(m[0]);
  }
  return null;
}

function getCalories(r) {
  if (!r) return null;

  // 1) nutrition.nutrients array (title or name)
  const nutrients = r?.nutrition?.nutrients;
  if (Array.isArray(nutrients) && nutrients.length) {
    const cal =
      nutrients.find((n) => {
        const txt = (n?.title || n?.name || "").toString().toLowerCase();
        return txt.includes("calorie");
      }) ||
      nutrients.find((n) => {
        // some items have unit like "kcal" or name variations
        const unit = String(n?.unit || "").toLowerCase();
        return /kcal|cal/.test(unit);
      });

    if (cal) {
      // prefer numeric amount, then value
      if (typeof cal.amount === "number") return cal.amount;
      if (typeof cal.value === "number") return cal.value;
      const parsed = parseNumber(cal.amount ?? cal.value ?? cal);
      if (parsed != null) return parsed;
    }
  }

  // 2) nested nutrition.calories or nutrition.calories.amount
  if (typeof r?.nutrition?.calories === "number") return r.nutrition.calories;
  if (r?.nutrition?.calories?.amount && typeof r.nutrition.calories.amount === "number")
    return r.nutrition.calories.amount;

  // 3) top-level calories fields
  if (typeof r?.calories === "number") return r.calories;
  if (typeof r?.caloriesPerServing === "number") return r.caloriesPerServing;

  if (typeof r?.calories === "string") {
    const p = parseNumber(r.calories);
    if (p != null) return p;
  }

  return null;
}

function getReadyInMinutes(r) {
  if (!r) return null;

  // list of common candidate properties
  const candidates = [
    r.readyInMinutes,
    r.ready_in_minutes,
    r.readyInMin,
    r.ready_in_min,
    r.time,
    r.totalTime,
    r.total_time,
    r.minutes,
    r.cookingMinutes,
    r.preparationMinutes,
    r.prepTime,
    r.cookTime,
    r.duration,
  ];

  for (const c of candidates) {
    const n = parseNumber(c);
    if (n != null) return n;
  }

  // try nested meta fields
  if (r?.meta) {
    const nested = [
      r.meta.readyInMinutes,
      r.meta.ready_in_minutes,
      r.meta.totalTime,
      r.meta.time,
    ];
    for (const c of nested) {
      const n = parseNumber(c);
      if (n != null) return n;
    }
  }

  // some APIs include analyzedInstructions with step durations — not a single value, skip for now
  return null;
}

/* ---------- Utils ---------- */

function tagClassName(tag) {
  const t = String(tag || "").toLowerCase();
  if (t.includes("dinner")) return "tag-dinner";
  if (t.includes("lunch")) return "tag-lunch";
  if (t.includes("breakfast")) return "tag-breakfast";
  return "tag-default";
}