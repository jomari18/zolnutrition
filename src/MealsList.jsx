import React, { memo } from "react";
import { AnimatedRow, Skeleton } from "./Motion";
import { totals, shiftDate } from "./lib";
import { meals, round } from "./ui";
import Icon from "./Icon";
function MealsList({
  entries,
  day,
  busy,
  loading,
  failed,
  pending,
  onCopy,
  onSave,
  onEdit,
  onDelete,
  onStart,
  onRetry,
}) {
  return (
    <section className="panel meals-panel">
      <div className="spread meals-heading">
        <div><div className="eyebrow">YOUR DAILY LOG</div><h2>Meals</h2></div>
        <button
          disabled={busy || loading || failed || !!pending}
          onClick={() => onCopy()}
        >
          <Icon name="copy" /> Copy {shiftDate(day, -1)}
        </button>
      </div>
      {failed ? (
        <div className="empty">
          <h3>Meals couldn't load</h3>
          <p>Check your connection and reload before logging more.</p>
          <button onClick={onRetry}>Reload meals</button>
        </div>
      ) : loading ? (
        <Skeleton label="Loading meals" />
      ) : !entries.length ? (
        <div className="empty">
          <h3>Start filling your plate</h3>
          <p>Add a food to see your remaining calories and macros update.</p>
          <button className="primary" onClick={onStart}>
            Log your first food
          </button>
        </div>
      ) : (
        meals.map((m) => {
          const list = entries.filter((i) => i.meal_type === m);
          return (
            list.length > 0 && (
              <details className="meal-group" open key={m}>
                <summary>
                  <span className="meal-dot" aria-hidden="true" /><span className="meal-name">{m}</span> ·{" "}
                  {round(
                    totals(
                      list.filter(
                        (i) =>
                          !(pending?.kind === "entry" && pending.id === i.id),
                      ),
                    ).calories,
                  )}{" "}
                  kcal
                </summary>
                <div className="meal-group-actions actions">
                  <button
                    disabled={busy || !!pending}
                    onClick={() => onCopy(m)}
                  >
                    <Icon name="copy" /> Copy {shiftDate(day, -1)}
                  </button>
                  <button
                    disabled={busy || !!pending}
                    onClick={() => onSave(m)}
                  >
                    <Icon name="saved" /> Save meal
                  </button>
                </div>
                <div className="meal-illustration" aria-hidden="true"><img src={m === "breakfast" || m === "snack" ? "/assets/breakfast.webp" : "/assets/chicken-rice.webp"} alt="" loading="lazy" width="480" height="480" /><span>Meal illustration</span></div>
                {list.map((i, index) => (
                  <AnimatedRow
                    key={i.id}
                    index={index}
                    removing={pending?.kind === "entry" && pending.id === i.id}
                  >
                    <div className="foodrow">
                      <div className="food-symbol" aria-hidden="true"><Icon name="meal" /></div>
                      <div className="food-copy">
                        <b>{i.food_name}</b>
                        <p className="muted">
                          {round(i.quantity_g)} g · {round(i.calories)} kcal
                        </p>
                        <div className="macro-chips">
                          <span data-k="protein">P {round(i.protein)}g</span>
                          <span data-k="carbs">C {round(i.carbs)}g</span>
                          <span data-k="fat">F {round(i.fat)}g</span>
                        </div>
                      </div>
                      <div className="entry-actions actions">
                        <button
                          className="entry-edit"
                          disabled={busy || !!pending}
                          onClick={() => onEdit(i)}
                          aria-label={`Edit ${i.food_name}`}
                        >
                          <Icon name="edit" /><span>Edit</span>
                        </button>
                        <button
                          className="entry-delete"
                          disabled={busy || !!pending}
                          onClick={() => onDelete(i)}
                          aria-label={`Delete ${i.food_name}`}
                        >
                          <Icon name="trash" /><span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </AnimatedRow>
                ))}
              </details>
            )
          );
        })
      )}
    </section>
  );
}
export default memo(MealsList);
