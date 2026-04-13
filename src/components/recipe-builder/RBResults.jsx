import React from "react";

/*
  RBResults
  Props:
   - results: array of recipe objects
   - loading: boolean
   - onOpen: function(recipe) -> called when user clicks a card
*/
export default function RBResults({ results = [], loading = false, onOpen = () => {} }) {
  if (loading) {
    return (
      <section className="rb-results">
        <div className="results-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="recipe-clay animate-pulse" aria-hidden>
              <div className="skeleton-media" />
              <div className="p-4 space-y-3">
                <div className="skeleton-line short" />
                <div className="skeleton-line" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Empty state (matches screenshot: big rounded card with chef emoji + copy)
  if (!loading && results.length === 0) {
    return (
      <section className="rb-results">
        <div className="card empty-state clay-card">
          <div className="empty-content">
            <div className="empty-emoji" aria-hidden>
              🧑‍🍳
            </div>
            <h3 className="empty-title">Ready to cook?</h3>
            <p className="empty-sub">
              Add ingredients &amp; hit <span className="text-accent" style={{ fontWeight: 700 }}>Find Recipes</span> to discover tasty dishes!
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Results grid
  return (
    <section className="rb-results">
      <h3 className="results-count">🎉 Found <span className="text-primary">{results.length}</span> recipes</h3>

      <div className="results-grid">
        {results.map((r, i) => (
          <article
            key={r.id}
            className="recipe-clay"
            style={{ animationDelay: `${i * 80}ms` }}
            onClick={() => onOpen(r)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") onOpen(r);
            }}
          >
            <div className="relative h-44 overflow-hidden bg-muted">
              {r.image ? (
                <img src={r.image} alt={r.title} loading="lazy" />
              ) : (
                <div className="skeleton-media" />
              )}

            </div>

            <div className="p-4 space-y-3 card-body">
              <h4 className="line-clamp-1" title={r.title}>
                {r.title}
              </h4>

              <div className="card-meta">
                {r.nutrition?.nutrients?.find((n) => n.title === "Calories") && (
                  <span className="meta">🔥 {Math.round(r.nutrition.nutrients.find((n) => n.title === "Calories").amount)} kcal</span>
                )}
                <span className="meta">⏱ {r.readyInMinutes ?? "—"} min</span>
              </div>

              {/* optional tags area (if you have tags) */}
              {Array.isArray(r.tags) && r.tags.length > 0 && (
                <div className="tag-row" aria-hidden>
                  {r.tags.map((t) => (
                    <span key={t} className={`tag ${tagClassName(t)}`}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function tagClassName(tag) {
  const t = String(tag || "").toLowerCase();
  if (t.includes("dinner")) return "tag--dinner";
  if (t.includes("lunch")) return "tag--lunch";
  if (t.includes("breakfast")) return "tag--breakfast";
  return "tag--default";
}