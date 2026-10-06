import useAndroidBack from "./useAndroidBack";
import { friendlyError } from "./errors";
import React, { useState, useRef } from "react";
import { sb, result } from "./client";
import {
  number,
  localDate,
  recommend,
  calculation,
  goalSignature,
} from "./lib";
import { Field, MacroInputs, macros, round } from "./ui";

export default function Onboarding({ uid, onDone }) {
  const [p, setP] = useState({
      age: 25,
      sex: "male",
      height: 170,
      weight: 70,
      workouts: 3,
      activity: "light",
    }),
    [type, setType] = useState("maintain"),
    [custom, setCustom] = useState(null),
    [target, setTarget] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [step, setStep] = useState(0);
  useAndroidBack(() => {
    if (busy) return true;
    if (step > 0) { setStep(s => s - 1); return true; }
    return false;
  });
  const lock = useRef(false),
    rec = recommend(p, type),
    values = custom || rec;
  const save = async (e) => {
    e.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await result(
        sb
          .from("profiles")
          .update({
            age: number(p.age),
            sex: p.sex,
            height_cm: number(p.height),
            workouts_per_week: number(p.workouts),
            activity_level: p.activity,
          })
          .eq("id", uid),
      );
      const g = {
        user_id: uid,
        goal_type: type,
        target_weight_kg: target ? number(target) : null,
        training_days: [1, 3, 5],
      };
      for (const k of macros) {
        g["daily_" + k] = number(values[k]);
        g["training_day_" + k] = number(values[k]);
        g["rest_day_" + k] = number(values[k]);
      }
      await result(
        sb.from("nutrition_goals").upsert(g, { onConflict: "user_id" }),
      );
      await result(
        sb.from("weight_logs").upsert(
          {
            user_id: uid,
            weight_kg: number(p.weight),
            logged_date: localDate(),
          },
          { onConflict: "user_id,logged_date" },
        ),
      );
      try {
        localStorage.setItem(
          "znTargetBaseline:" + uid,
          JSON.stringify({
            weight: number(p.weight),
            signature: goalSignature(g),
          }),
        );
      } catch {
        /* Storage is optional. */
      }
      onDone(g);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const calc = calculation(p);
  const field = (k, label, min, max) => (
    <Field
      label={label}
      type="number"
      min={min}
      max={max}
      step={k === "age" || k === "workouts" ? "1" : "any"}
      required
      value={p[k]}
      onChange={(e) => {
        setP({ ...p, [k]: e.target.value });
        setCustom(null);
      }}
    />
  );
  const activities = [
    ["sedentary", "Mostly sitting", "Little walking outside workouts"],
    ["light", "Lightly active", "Some walking and daily chores"],
    ["moderate", "Moderately active", "On your feet for much of the day"],
    ["very_active", "Very active", "Physical work or lots of daily movement"],
  ];
  return (
    <main className="onboarding-layout">
      <aside className="onboarding-intro">
      <div className="eyebrow">BUILT AROUND YOU</div><h2>A starting point.<br /><span>Room to grow.</span></h2><p>A few details help us estimate how much to eat. You stay in control of your targets.</p>
      <div className="setup-note"><b>{["01 / Your body", "02 / Your routine", "03 / Your targets"][step]}</b><p>{["Start with your age, height and current weight.", "Choose the activity and goal that fit your everyday life.", "Review the estimate or customize it before saving."][step]}</p></div>
      </aside>
      <section className="panel setup onboarding-card">
      <div className="eyebrow">YOUR STARTING POINT</div>
      <h1>Set your daily targets</h1>
      <ol className="steps" aria-label="Setup progress">
        {["Body", "Activity & goal", "Review"].map((name, i) => (
          <li key={name} aria-current={step === i ? "step" : undefined}>
            {i + 1}. {name}
          </li>
        ))}
      </ol>
      <form onSubmit={save}>
        <section key={step} className="tab-content">
          {step === 0 && (
            <>
              <h2>Your body</h2>
              <div className="grid">
                {field("age", "Age", 18, 120)}
                {field("height", "Height (cm)", 80, 250)}
                {field("weight", "Current weight (kg)", 20, 350)}
                <label>
                  Sex used for the estimate
                  <select
                    value={p.sex}
                    onChange={(e) => {
                      setP({ ...p, sex: e.target.value });
                      setCustom(null);
                    }}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>
              </div>
              <p className="muted">
                These details help estimate your starting calorie and macro
                targets.
              </p>
            </>
          )}
          {step === 1 && (
            <>
              <h2>Activity & goal</h2>
              {field("workouts", "Workouts per week", 0, 7)}
              <label>
                Daily activity outside workouts
                <select
                  value={p.activity}
                  onChange={(e) => {
                    setP({ ...p, activity: e.target.value });
                    setCustom(null);
                  }}
                >
                  {activities.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="muted">
                {activities.find((a) => a[0] === p.activity)[2]}
              </p>
              <fieldset>
                <legend>Your goal</legend>
                <div className="goal-cards">
                  {[
                    ["lose", "Lose weight", "A modest calorie deficit"],
                    ["maintain", "Maintain", "Start near your estimated needs"],
                    ["gain", "Gain weight", "A modest calorie surplus"],
                  ].map(([value, label, desc]) => (
                    <label
                      className={
                        type === value ? "selected goal-card" : "goal-card"
                      }
                      key={value}
                    >
                      <input
                        type="radio"
                        name="goal"
                        checked={type === value}
                        onChange={() => {
                          setType(value);
                          setCustom(null);
                        }}
                      />
                      <b>{label}</b>
                      <span>{desc}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field
                label="Target weight (kg, optional)"
                type="number"
                min="20"
                max="350"
                step="any"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </>
          )}
          {step === 2 && (
            <>
              <h2>Review your starting targets</h2>
              <p className="muted">
                Starting estimates, not medical advice. Review your progress and
                adjust as needed.
              </p>
              <div className="actions">
                <button
                  type="button"
                  aria-pressed={!custom}
                  onClick={() => setCustom(null)}
                >
                  Use recommended
                </button>
                <button
                  type="button"
                  aria-pressed={!!custom}
                  onClick={() => setCustom({ ...values })}
                >
                  Customize
                </button>
              </div>
              {custom ? (
                <MacroInputs value={custom} onChange={setCustom} />
              ) : (
                <dl className="review-macros">
                  {macros.map((k) => (
                    <div data-k={k} key={k}>
                      <dt>{k}</dt>
                      <dd>
                        {round(rec[k])} {k === "calories" ? "kcal" : "g"}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              <details className="calculation" open>
                <summary>How we calculated this</summary>
                <p>
                  BMR: {round(calc.bmr)} kcal/day using your age, height, weight
                  and sex (Mifflin–St Jeor estimate).
                </p>
                <p>
                  Activity factor: ×{calc.factor.toFixed(3)} including{" "}
                  {p.workouts} weekly workouts.
                </p>
                <p>
                  Goal adjustment:{" "}
                  {type === "lose" ? "−15%" : type === "gain" ? "+10%" : "0%"}.
                  Calories are rounded to the nearest 10.
                </p>
                <p className="muted">
                  Training and rest days start with the same targets. You can
                  customize them later.
                </p>
              </details>
            </>
          )}
        </section>
        {error && (
          <p role="alert" className="bad">
            {error} Your details are kept here so you can try saving again.
          </p>
        )}
        <div className="actions">
          {step > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep(step - 1)}
            >
              Back
            </button>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : step < 2 ? "Continue" : "Save & Continue"}
          </button>
        </div>
      </form>
      </section>
    </main>
  );
}
