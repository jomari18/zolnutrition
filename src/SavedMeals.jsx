import { AnimatedRow } from "./Motion";
import React, { useState } from "react";
import { totals, mealByTime } from "./lib";
import { meals, round } from "./ui";
import Icon from "./Icon";

export default function SavedMeals({
  saved,
  items,
  busy,
  add,
  remove,
  mealOverride,
  onEmpty,
  removingId,
}) {
  const [choice, setMeal] = useState(mealByTime), [query, setQuery] = useState("");
  const meal = mealOverride || choice;
  const compact = !!mealOverride;
  const filtered = saved.filter(s => s.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <>
      <div className="saved-toolbar">
      {!compact && <label>Find a saved meal<input type="search" placeholder="Search your meals…" value={query} onChange={e => setQuery(e.target.value)} /></label>}
      {!mealOverride && (
        <label>
          Add to
          <select value={meal} onChange={(e) => setMeal(e.target.value)}>
            {meals.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      )}
      </div>
      {!saved.length && (
        <div className="empty">
          <h3>Save meals you eat often</h3>
          <p>
            Log a meal, then choose “Save meal” to reuse all its foods together.
          </p>
          {onEmpty && <button onClick={onEmpty}>Log your first meal</button>}
        </div>
      )}
      {!!saved.length && !filtered.length && <div className="panel empty"><h3>No matching meals</h3><p>Try a different name.</p><button onClick={() => setQuery("")}>Clear search</button></div>}
      <div className={compact ? "saved-compact" : "saved-grid"}>
      {filtered.map((s, index) => {
        const rows = items.filter(i => i.saved_meal_id === s.id), sum = totals(rows);
        const breakfast = /oat|banana|egg/i.test(rows.map(i => i.food_name).join(" "));
        return (
        <AnimatedRow key={s.id} index={index} removing={removingId === s.id}>
          <article className={compact ? "foodrow" : "saved-card panel"}>
            {!compact && <div className="saved-cover"><img src={breakfast ? "/assets/breakfast.webp" : "/assets/chicken-rice.webp"} alt="" width="480" height="480" loading="lazy" /><span>Meal illustration</span></div>}
            <div>
              {compact ? <b>{s.name}</b> : <h2>{s.name}</h2>}
              <p className="muted">
                <b>{round(sum.calories)}</b> kcal · {rows.length} {rows.length === 1 ? "food" : "foods"}
              </p>
              {!compact && <div className="macro-chips">{["protein", "carbs", "fat"].map(k => <span data-k={k} key={k}>{k[0].toUpperCase()} {round(sum[k])}g</span>)}</div>}
              {!compact && <details className="saved-ingredients"><summary>View foods</summary>{rows.map(i => <p key={i.id}>{i.food_name}<span>{round(i.quantity_g)} g</span></p>)}</details>}
            </div>
            <div className="actions">
              <button
                className="primary"
                disabled={busy}
                onClick={() => add(s.id, meal)}
                aria-label={`Add ${s.name}`}
              >
                <Icon name="plus" /> {compact ? "Add" : `Add to ${meal}`}
              </button>
              {remove && (
                <button
                  disabled={busy}
                  onClick={() => remove(s.id)}
                  aria-label={`Delete saved meal ${s.name}`}
                >
                  Delete
                </button>
              )}
            </div>
          </article>
        </AnimatedRow>
      );})}
      </div>
    </>
  );
}
