import React, { useState, useEffect } from "react";
import { number, scaleNutrition, mealByTime } from "./lib";
import { Field, MacroInputs, macros, meals, round } from "./ui";

import FoodSearch from "./FoodSearch.jsx";
import useFoodCatalog from "./useFoodCatalog";
import { searchFoods } from "./foodSearchUtils.js";

const blankFood = {
  food_name: "",
  quantity_g: 100,
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  meal_type: "breakfast",
  food_id: null,
};
export default function FoodForm({
  foods,
  prefill,
  busy,
  onSave,
  onClear,
  defaultMeal,
}) {
  const [form, setForm] = useState({
      ...blankFood,
      meal_type: defaultMeal || mealByTime(),
    }),
    [saveFood, setSaveFood] = useState(false),
    [pick, setPick] = useState(null);
  const {catalog, catalogError, retryCatalog} = useFoodCatalog();
  useEffect(() => {
    if (prefill) {
      setForm({ ...blankFood, ...prefill });
      setPick({ ...prefill, serving_size_g: prefill.quantity_g });
      setSaveFood(false);
    }
  }, [prefill]);
  useEffect(() => {
    if (defaultMeal) setForm((old) => ({ ...old, meal_type: defaultMeal }));
  }, [defaultMeal]);
  const choose = (f) => {
    setPick(f);
    setForm({
      ...blankFood,
      meal_type: form.meal_type,
      food_name: f.name,
      quantity_g: f.serving_size_g,
      food_id: f.id || null,
      ...scaleNutrition(f, number(f.serving_size_g)),
    });
    setSaveFood(false);
  };
  const suggestions = form.food_name.trim() && !pick
    ? searchFoods([...foods, ...catalog], form.food_name).filter(f=>f.name!==form.food_name).slice(0,6) : [];
  return (
    <>
      <div hidden={!!pick}><FoodSearch foods={foods} catalog={catalog} catalogError={catalogError} retryCatalog={retryCatalog} busy={busy} onChoose={choose} /></div>
      {pick && <div className="selected-food" role="status"><strong>Selected: {pick.name}</strong>
        {pick.fdcId ? <><p>{pick.description}</p><a href={`https://fdc.nal.usda.gov/food-details/${pick.fdcId}/nutrients`} target="_blank" rel="noreferrer">USDA SR Legacy · FDC {pick.fdcId}</a></> : <p>{pick.source || "Your food library"}</p>}
        <p>Adjust Amount (g) below. Nutrition scales automatically from {pick.serving_size_g} g.</p>
        <button type="button" onClick={()=>setPick(null)}>Change food</button>
      </div>}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const data = {
            ...form,
            quantity_g: number(form.quantity_g),
            ...Object.fromEntries(macros.map((k) => [k, number(form[k])])),
          };
          if (form.calories === "")
            data.calories = data.protein * 4 + data.carbs * 4 + data.fat * 9;
          const ok = await onSave(data, saveFood);
          if (ok) {
            setForm({ ...blankFood, meal_type: defaultMeal || mealByTime() });
            setPick(null);
            setSaveFood(false);
            onClear();
          }
        }}
      >
        <Field
          label="Food name"
          maxLength="120"
          required
          value={form.food_name}
          onChange={(e) => {
            setForm({ ...form, food_name: e.target.value, food_id: null });
            setPick(null);
          }}
        />
        <div className="suggestions">
          {suggestions.map((f) => (
            <button
              type="button"
              key={f.id || f.fdcId}
              disabled={busy}
              onClick={() => choose(f)}
            >
              {f.name}
            </button>
          ))}
        </div>
        <div className="grid">
          <label>
            Meal
            <select
              value={form.meal_type}
              onChange={(e) => setForm({ ...form, meal_type: e.target.value })}
            >
              {meals.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <Field
            label="Amount (g)"
            type="number"
            min="0.1"
            step="any"
            required
            value={form.quantity_g}
            onChange={(e) =>
              setForm({
                ...form,
                quantity_g: e.target.value,
                ...(pick ? scaleNutrition(pick, number(e.target.value)) : {}),
              })
            }
          />
        </div>
        <MacroInputs
          caloriesOptional
          value={form}
          onChange={(next) => {
            setForm(next);
            setPick(null);
          }}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={saveFood}
            onChange={(e) => setSaveFood(e.target.checked)}
          />
          Save this food for reuse
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : "Log food"}
        </button>
      </form>
    </>
  );
}
