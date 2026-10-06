import React, { useState } from "react";
import Icon from "./Icon";
import FoodForm from "./FoodForm";
import SavedMeals from "./SavedMeals";
import { mealByTime } from "./lib";
import { meals, round } from "./ui";
export default function Logger({
  foods,
  recent,
  frequent,
  saved,
  items,
  busy,
  add,
  addSaved,
  onDone,
}) {
  const [meal, setMeal] = useState(mealByTime),
    [mode, setMode] = useState("Recent");
  const quick = async (entry) => {
    if (await add({ ...entry, meal_type: meal }, false)) onDone?.();
  };
  return (
    <div className="logger">
      <label>
        Add to meal
        <select value={meal} onChange={(e) => setMeal(e.target.value)}>
          {meals.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <div className="actions logger-tabs" aria-label="Food sources" style={{ "--source-index": ["Recent", "Frequent", "Saved", "Search"].indexOf(mode) }}>
        <span className="source-indicator" aria-hidden="true" />
        {["Recent", "Frequent", "Saved", "Search"].map((t) => (
          <button
            type="button"
            key={t}
            aria-pressed={mode === t}
            onClick={() => setMode(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="logger-content" key={mode}>
      {mode === "Search" ? (
        <FoodForm
          foods={foods}
          defaultMeal={meal}
          busy={busy}
          onSave={async (...args) => {
            const ok = await add(...args);
            if (ok) onDone?.();
            return ok;
          }}
          onClear={() => {}}
        />
      ) : mode === "Saved" ? (
        <SavedMeals
          saved={saved}
          items={items}
          busy={busy}
          mealOverride={meal}
          add={async (...args) => {
            if (await addSaved(...args)) onDone?.();
          }}
        />
      ) : (
        <>
          <p className="muted">
            One tap logs the same serving to {meal}.{" "}
            {mode === "Frequent"
              ? "Based on the 90 days ending on the selected date."
              : ""}
          </p>
          {(mode === "Recent" ? recent : frequent).length ? (
            <div className="suggestions quick-foods">
              {(mode === "Recent" ? recent : frequent).map((i) => (
                <button
                  type="button"
                  disabled={busy}
                  key={i.id}
                  onClick={() => quick(i)}
                >
                  <b className="quick-name">{i.food_name}</b>
                  <span className="quick-meta">{round(i.quantity_g)} g · {round(i.calories)} kcal</span>
                  <span className="quick-add" aria-hidden="true"><Icon name="plus" /></span>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty">
              <h3>Your repeat foods will appear here</h3>
              <p>Log your first food to make the next meal faster.</p>
              <button onClick={() => setMode("Search")}>
                Find or enter food
              </button>
            </div>
          )}
          <details>
            <summary>Different serving or a new food?</summary>
            <FoodForm
              foods={foods}
              defaultMeal={meal}
              busy={busy}
              onSave={async (...args) => {
                const ok = await add(...args);
                if (ok) onDone?.();
                return ok;
              }}
              onClear={() => {}}
            />
          </details>
        </>
      )}
      </div>
    </div>
  );
}
