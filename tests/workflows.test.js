import { test } from "node:test";
import assert from "node:assert/strict";
import {
  balance,
  dayType,
  localDate,
  shiftDate,
  targets,
  mealRow,
  mealByTime,
  calculation,
  recommend,
} from "../src/lib.js";
import { friendlyError } from "../src/errors.js";

test("calendar navigation crosses leap days and year boundaries", () => {
  assert.equal(shiftDate("2024-03-01", -1), "2024-02-29");
  assert.equal(shiftDate("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDate("2026-03-08", 1), "2026-03-09");
  assert.equal(localDate(new Date(2026, 9, 3, 23, 59)), "2026-10-03");
});
test("training/rest selection respects schedule, empty schedule, overrides and zero values", () => {
  const goal = {
    training_days: [1, 3, 5],
    daily_calories: 2100,
    training_day_calories: 2400,
    rest_day_calories: 1900,
    rest_day_carbs: 0,
  };
  assert.equal(dayType(goal, "2026-10-02"), "training");
  assert.equal(dayType(goal, "2026-10-03"), "rest");
  assert.equal(dayType(goal, "2026-10-02", { "2026-10-02": "rest" }), "rest");
  assert.equal(dayType({ ...goal, training_days: [] }, "2026-10-02"), "rest");
  assert.equal(targets(goal, "training").calories, 2400);
  assert.equal(targets(goal, "rest").calories, 1900);
  assert.equal(targets(goal, "rest").carbs, 0);
  assert.equal(targets({ daily_calories: 2100 }, "rest").calories, 2100);
});
test("remaining and over preserve amounts below, at and above the goal", () => {
  assert.deepEqual(balance(1500, 2000), {
    consumed: 1500,
    target: 2000,
    remaining: 500,
    over: 0,
    ratio: 0.75,
  });
  assert.deepEqual(balance(2000, 2000), {
    consumed: 2000,
    target: 2000,
    remaining: 0,
    over: 0,
    ratio: 1,
  });
  assert.deepEqual(balance(2250, 2000), {
    consumed: 2250,
    target: 2000,
    remaining: 0,
    over: 250,
    ratio: 1,
  });
  assert.equal(balance("100.5", "100").over, 0.5);
  assert.deepEqual(balance(0, 0), {
    consumed: 0,
    target: 0,
    remaining: 0,
    over: 0,
    ratio: 0,
  });
  assert.equal(balance(10, 0).over, 10);
  assert.equal(balance(10, 0).ratio, 1);
  assert.equal(balance(-1, 100).remaining, 100);
});
test("repeat-food insert strips database IDs and old ownership/date", () => {
  const row = mealRow(
    {
      id: 99,
      user_id: "someone-else",
      logged_date: "2000-01-01",
      created_at: "old",
      food_id: 7,
      food_name: "Rice",
      quantity_g: "150",
      calories: 195,
      protein: 4,
      carbs: 42,
      fat: 0.5,
      meal_type: "lunch",
    },
    "current-user",
    "2026-10-03",
    "dinner",
  );
  assert.equal(row.user_id, "current-user");
  assert.equal(row.logged_date, "2026-10-03");
  assert.equal(row.meal_type, "dinner");
  assert.equal(row.quantity_g, 150);
  assert.equal(row.food_id, 7);
  assert.ok(!("id" in row));
  assert.ok(!("created_at" in row));
});
test("meal defaults follow local time", () => {
  assert.equal(mealByTime(new Date(2026, 9, 3, 8)), "breakfast");
  assert.equal(mealByTime(new Date(2026, 9, 3, 12)), "lunch");
  assert.equal(mealByTime(new Date(2026, 9, 3, 19)), "dinner");
  assert.equal(mealByTime(new Date(2026, 9, 3, 23)), "snack");
});
test("onboarding explanation uses the same calculation as recommended targets", () => {
  const p = {
    age: 25,
    weight: 70,
    height: 170,
    sex: "male",
    workouts: 3,
    activity: "light",
  };
  const c = calculation(p);
  assert.equal(c.bmr, 1642.5);
  assert.equal(c.factor, 1.375);
  assert.equal(
    recommend(p, "maintain").calories,
    Math.round((c.bmr * c.factor) / 10) * 10,
  );
  assert.ok(recommend(p, "lose").calories < recommend(p, "maintain").calories);
  assert.ok(recommend(p, "gain").calories > recommend(p, "maintain").calories);
});
test("database errors are translated without exposing server detail", () => {
  assert.match(
    friendlyError({
      code: "42501",
      message: "private table secret_details denied",
    }),
    /account/,
  );
  assert.ok(
    !friendlyError({
      code: "42501",
      message: "private table secret_details denied",
    }).includes("secret_details"),
  );
  assert.match(friendlyError({ code: "23505" }), /already exists/);
  assert.match(friendlyError({ code: "invalid_credentials" }), /password/);
  assert.match(friendlyError(new TypeError("Failed to fetch")), /Connection/);
});
