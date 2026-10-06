import { test } from "node:test";
import assert from "node:assert/strict";
import {
  localDate,
  shiftDate,
  totals,
  targets,
  scaleNutrition,
  normalizeProducts,
} from "../src/lib.js";
test("local calendar date does not shift to UTC", () => {
  assert.equal(localDate(new Date(2026, 9, 3, 0, 15)), "2026-10-03");
  assert.equal(shiftDate("2026-03-01", -1), "2026-02-28");
});
test("macro totals and gram changes remain proportional", () => {
  const food = {
    serving_size_g: 100,
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
  };
  assert.deepEqual(scaleNutrition(food, 200), {
    calories: 330,
    protein: 62,
    carbs: 0,
    fat: 7.2,
  });
  assert.equal(totals([{ calories: "165" }, { calories: 130 }]).calories, 295);
  assert.throws(() => scaleNutrition({ ...food, serving_size_g: 0 }, 50));
});
test("zero targets are retained instead of falling back", () => {
  assert.equal(
    targets({ daily_calories: 2000, rest_day_calories: 0 }, "rest").calories,
    0,
  );
});
test("food lookup uses per-100g energy rather than per-serving energy", () => {
  const rows = normalizeProducts([
    {
      product_name: "Rice",
      nutriments: { "energy-kcal": 50, energy_100g: 544, proteins_100g: 2.7, carbohydrates_100g: 28, fat_100g: .3 },
    },
  ]);
  assert.ok(Math.abs(rows[0].calories - 130) < 1);
});
