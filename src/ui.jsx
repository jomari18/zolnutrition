import React from "react";
import { number } from "./lib";
export const macros = ["calories", "protein", "carbs", "fat"],
  meals = ["breakfast", "lunch", "dinner", "snack"];
export const round = (x) => Math.round(number(x)).toLocaleString();
export const stored = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
export function Field({ label, ...props }) {
  return (
    <label>
      {label}
      <input {...props} />
    </label>
  );
}
export function MacroInputs({ value, onChange, caloriesOptional = false }) {
  return (
    <div className="grid">
      {macros.map((k) => (
        <Field
          key={k}
          label={k + (k === "calories" ? " (kcal)" : " (g)")}
          type="number"
          min="0"
          step="any"
          required={!(caloriesOptional && k === "calories")}
          value={value[k] ?? ""}
          onChange={(e) => onChange({ ...value, [k]: e.target.value })}
        />
      ))}
    </div>
  );
}
