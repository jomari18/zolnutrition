import WeightChart from "./WeightChart";
import { useDialog } from "./Dialog";
import React, { useState, useEffect } from "react";
import { number, shiftDate, totals, targets } from "./lib";
import { Field, round } from "./ui";
import Icon from "./Icon";
import { NutritionBar } from "./Motion";

export default function Progress({
  history,
  weights,
  goal,
  day,
  typeFor,
  busy,
  log,
  adjust,
}) {
  const [weight, setWeight] = useState("");
  const ask = useDialog();
  useEffect(() => {
    setWeight(weights.find((w) => w.logged_date === day)?.weight_kg ?? "");
  }, [day, weights]);
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(day, i - 6)),
    daily = days.map((d) => totals(history.filter((i) => i.logged_date === d))),
    logged = days.filter((d) => history.some((i) => i.logged_date === d)),
    avg = (k) =>
      logged.length
        ? logged.reduce(
            (a, d) => a + totals(history.filter((i) => i.logged_date === d))[k],
            0,
          ) / logged.length
        : 0;
  let rate = null,
    adj = 0;
  if (weights.length >= 6) {
    const last = weights.slice(-14),
      half = Math.floor(last.length / 2),
      a = last.slice(0, half),
      b = last.slice(half),
      avgW = (x) => x.reduce((s, w) => s + number(w.weight_kg), 0) / x.length;
    const center = (x) =>
      x.reduce(
        (s, w) => s + new Date(w.logged_date + "T12:00:00").getTime(),
        0,
      ) / x.length;
    const elapsed = (center(b) - center(a)) / 604800000;
    if (elapsed > 0) rate = (avgW(b) - avgW(a)) / elapsed;
    if (rate !== null) {
      if (goal.goal_type === "gain")
        adj = rate < 0.1 ? 100 : rate > 0.5 ? -100 : 0;
      else if (goal.goal_type === "lose")
        adj = rate > -0.1 ? -100 : rate < -0.75 ? 100 : 0;
      else adj = rate > 0.25 ? -100 : rate < -0.25 ? 100 : 0;
    }
  }
  return (
    <div className="progress-page">
      <div className="progress-stats">
        {[["Latest weight", weights.length ? number(weights.at(-1).weight_kg).toFixed(1) + " kg" : "—", "Last recorded weigh-in", "progress"], ["Weight trend", rate === null ? "—" : (rate >= 0 ? "+" : "") + rate.toFixed(2) + " kg/wk", "Estimated from recorded weigh-ins", "target"], ["Average calories", logged.length ? round(avg("calories")) + " kcal" : "—", "On logged days in this 7-day window", "flame"], ["Days logged", logged.length + " / 7", "Every entry builds a clearer picture", "meal"]].map(([label, value, note, icon]) => <div className="panel progress-stat" key={label}><Icon name={icon} /><span>{label}</span><b>{value}</b><small>{note}</small></div>)}
      </div>
      <div className="progress-columns">
      <section className="panel weekly-review">
        <div className="eyebrow">YOUR WEEK AT A GLANCE</div>
        <h2>Last 7 days</h2>
        <div className="bars">
          {days.map((d, i) => (
            <div key={d}>
              <span>{round(daily[i].calories)}</span>
              <i
                style={{
                  height: Math.max(
                    2,
                    (daily[i].calories /
                      Math.max(...daily.map((x) => x.calories), 1)) *
                      100,
                  ),
                }}
              />
              <small>
                {new Date(d + "T12:00:00").toLocaleDateString(undefined, {
                  weekday: "short",
                })}
              </small>
            </div>
          ))}
        </div>
        <p>
          {round(avg("calories"))} avg kcal · {round(avg("protein"))}g avg
          protein · {logged.length}/7 days logged
        </p>
        <p className="muted">
          Average target on logged days:{" "}
          {round(
            logged.length
              ? logged.reduce(
                  (s, d) => s + targets(goal, typeFor(d)).calories,
                  0,
                ) / logged.length
              : 0,
          )}{" "}
          kcal
        </p>
      </section>
      <section className="panel weight-detail">
        <div className="spread"><h2>Weight progress</h2><span className="muted">Recorded weight + rolling average</span></div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            log(number(weight));
          }}
        >
          <div className="actions">
            <Field
              label={`Weight for ${day} (kg)`}
              type="number"
              min="20"
              max="350"
              step="any"
              required
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
            <button className="primary" disabled={busy}>
              {weights.some((w) => w.logged_date === day)
                ? "Update weight"
                : "Log weight"}
            </button>
          </div>
        </form>
        <WeightChart weights={weights} target={goal.target_weight_kg} />
        {rate === null ? (
          <p className="muted">
            Log at least 6 weigh-ins to compare your trend.
          </p>
        ) : (
          <>
            <p>
              {rate >= 0 ? "+" : ""}
              {rate.toFixed(2)} kg/week estimated trend
            </p>
            {adj !== 0 && (
              <>
                <p className="muted">
                  Optional adjustment based on your recorded trend. Review your
                  logging consistency before changing targets.
                </p>
                <button
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await ask({
                        title: "Adjust calorie targets?",
                        message: `Change both training and rest targets by ${adj > 0 ? "+" : ""}${adj} kcal? This is optional.`,
                        action: "Apply adjustment",
                      })
                    )
                      adjust(adj);
                  }}
                >
                  Apply {adj > 0 ? "+" : ""}
                  {adj} kcal
                </button>
              </>
            )}
          </>
        )}
      </section>
      <section className="panel average-macros"><h2>Average macros</h2><p className="muted">Consumed averages and targets on logged days in the selected 7-day window.</p><div className="average-macro-grid">{["protein", "carbs", "fat"].map(k => {
        const goalAvg = logged.length ? logged.reduce((s, d) => s + targets(goal, typeFor(d))[k], 0) / logged.length : 0;
        return <div data-k={k} key={k}><span className="macro-name"><Icon name={k} />{k}</span><p><b>{logged.length ? round(avg(k)) : "—"}</b> / {round(goalAvg)} g</p><NutritionBar name={k} consumed={avg(k)} target={goalAvg} pulse={false} /></div>;
      })}</div></section>
      </div>
    </div>
  );
}
