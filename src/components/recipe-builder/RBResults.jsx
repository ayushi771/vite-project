import React from "react";

export default function RBResults({ results, loading, onOpen }) {
  return (
    <section className="rb-results">
      {results.length === 0 && !loading && (
        <p className="rb-hint">No results yet — add ingredients and press "Find Recipes".</p>
      )}

      <div className="grid">
        {results.map((r) => (
          <article className="card" key={r.id} onClick={() => onOpen(r)}>
            {r.image && <img src={r.image} alt={r.title} loading="lazy" />}
            <div className="card-body">
              <h3>{r.title}</h3>
              <div className="card-meta">
                {r.nutrition?.nutrients &&
                  r.nutrition.nutrients.find((n) => n.title === "Calories") && (
                    <span className="meta">
                      🔥{" "}
                      {Math.round(r.nutrition.nutrients.find((n) => n.title === "Calories").amount)}{" "}
                      kcal
                    </span>
                  )}
                <span className="meta">⏱ {r.readyInMinutes ?? "—"} min</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}