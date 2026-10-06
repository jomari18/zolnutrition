import React, { useState } from "react";
import { number, targets } from "./lib";
import { MacroInputs, macros, round } from "./ui";
import Icon from "./Icon";

export default function TargetEditor({ goal, busy, save, proposal, day, type }) {
  const [days, setDays] = useState(goal.training_days || [1, 3, 5]),
    [training, setTraining] = useState(targets(goal, "training")),
    [rest, setRest] = useState(targets(goal, "rest"));
  return (
    <section className="targets-page">
      <div className="target-intro panel"><div><div className="eyebrow">A PLAN FOR EVERY DAY</div><h2>Schedule & targets</h2><p className="muted">Choose your training days, then set the targets that work for you.</p></div><span className="goal-pill">{goal.goal_type === "gain" ? "Gain weight" : goal.goal_type === "lose" ? "Lose weight" : "Maintain weight"}</span></div>
      {proposal && (
        <aside className="notice">
          <div>
            <b>New starting estimate</b>
            <p>
              {proposal.calories} kcal · P {proposal.protein}g · C{" "}
              {proposal.carbs}g · F {proposal.fat}g
            </p>
            <p className="muted">
              Based on your latest recorded weight. Use it below, then save only
              if it fits your goals.
            </p>
            <button
              type="button"
              onClick={() => {
                setTraining({ ...proposal });
                setRest({ ...proposal });
              }}
            >
              Use estimate in editor
            </button>
          </div>
        </aside>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const patch = { training_days: days };
          for (const [type, value] of [
            ["training", training],
            ["rest", rest],
          ])
            for (const k of macros)
              patch[`${type}_day_${k}`] = number(value[k]);
          save(patch);
        }}
      >
        <div className="schedule-panel panel"><h2>Your training week</h2><p className="muted">Selected days use training targets. Other days use rest targets.</p><div className="daychecks">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
            <label className="check" key={d}>
              <input
                type="checkbox"
                checked={days.includes(i)}
                onChange={(e) =>
                  setDays(
                    e.target.checked
                      ? [...days, i]
                      : days.filter((x) => x !== i),
                  )
                }
              />
              {d}
            </label>
          ))}
        </div>
        </div>
        <div className="target-editor-grid">
          {[["training", training, setTraining], ["rest", rest, setRest]].map(([name, value, change]) => <fieldset className={`target-card panel ${name}`} key={name}>
            <legend>{name === "training" ? "Training day" : "Rest day"}</legend>
            <div className="target-card-hero"><span className="eyebrow"><Icon name={name === "training" ? "protein" : "clock"} /> {name === "training" ? "FUEL YOUR SESSION" : "SUPPORT YOUR RECOVERY"}</span><div className="target-calories">{round(value.calories)} <small>kcal / day</small></div><p>{name === "training" ? "A daily plan for the days you train." : "Keep your nutrition consistent between sessions."}</p></div>
            <MacroInputs value={value} onChange={change} />
          </fieldset>)}
          <aside className="panel target-explainer"><Icon name="target" /><h2>Your plan, your pace</h2><p className="muted">Training and rest targets can be different. Use your progress and logging consistency to guide adjustments.</p><div className="current-plan"><span>{day || "Selected date"}</span><b>{type === "training" ? "Training" : "Rest"} day</b><p>{round(targets(goal, type || "rest").calories)} kcal currently saved</p></div><p className="muted">Edits below are a draft until you choose Save. Switching a single day on the dashboard stays on this browser only.</p></aside>
        </div>
<div className="target-savebar panel"><p className="muted">Your current targets stay in place until you save.</p><button className="primary" disabled={busy}>Save schedule & targets</button></div>
      </form>
    </section>
  );
}
