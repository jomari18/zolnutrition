export const number = (v) => Number(v) || 0;
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const shiftDate = (date, n) => {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + n);
  return localDate(d);
};
export const totals = (rows) =>
  rows.reduce(
    (a, r) =>
      Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + number(r[k])])),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
export function targets(goal, type) {
  return Object.fromEntries(
    ["calories", "protein", "carbs", "fat"].map((k) => [
      k,
      number(goal[`${type}_day_${k}`] ?? goal[`daily_${k}`]),
    ]),
  );
}
export function scaleNutrition(food, quantity) {
  if (!(number(food.serving_size_g) > 0))
    throw Error("Food serving size must be positive.");
  return Object.fromEntries(
    ["calories", "protein", "carbs", "fat"].map((k) => [
      k,
      +((number(food[k]) * quantity) / food.serving_size_g).toFixed(2),
    ]),
  );
}
export function recommend(p, type) {
  const weight = number(p.weight),
    { bmr, factor } = calculation(p);
  const calories =
      Math.round(
        (bmr * factor * (type === "lose" ? 0.85 : type === "gain" ? 1.1 : 1)) /
          10,
      ) * 10,
    protein = Math.round(weight * (type === "lose" ? 2 : 1.8)),
    fat = Math.round(weight * 0.8);
  return {
    calories,
    protein,
    fat,
    carbs: Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4)),
  };
}
export function normalizeProducts(products) {
  const seen = new Set();
  return (products || [])
    .filter((p) => (p.product_name_en || p.product_name) && p.nutriments &&
      ["proteins_100g", "carbohydrates_100g", "fat_100g"].every(k =>
        p.nutriments[k] !== undefined && p.nutriments[k] !== null && p.nutriments[k] !== "" && Number.isFinite(Number(p.nutriments[k])) && Number(p.nutriments[k]) >= 0))
    .map((p) => {
      const n = p.nutriments;
      return {
        name: (
          (p.product_name_en || p.product_name) + (p.brands ? " · " + p.brands.split(",")[0] : "")
        ).slice(0, 100),
        source: "Open Food Facts · check your package label",
        serving_size_g: 100,
        calories:
          number(n["energy-kcal_100g"]) || number(n.energy_100g) / 4.184,
        protein: number(n.proteins_100g),
        carbs: number(n.carbohydrates_100g),
        fat: number(n.fat_100g),
      };
    })
    .filter((p) => {
      const key = p.name.toLowerCase() + "|" + Math.round(p.calories);
      if (!Number.isFinite(p.calories) || p.calories <= 0 || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);
}

export function balance(consumed, target) {
  consumed = Math.max(0, number(consumed));
  target = Math.max(0, number(target));
  return {
    consumed,
    target,
    remaining: Math.max(0, target - consumed),
    over: Math.max(0, consumed - target),
    ratio: target > 0 ? Math.min(consumed / target, 1) : consumed > 0 ? 1 : 0,
  };
}
export const dayType = (goal, date, overrides = {}) =>
  overrides[date] ||
  ((goal.training_days ?? [1, 3, 5]).includes(
    new Date(date + "T12:00:00").getDay(),
  )
    ? "training"
    : "rest");
export const mealRow = (entry, uid, date, meal = entry.meal_type) => ({
  user_id: uid,
  logged_date: date,
  meal_type: meal,
  food_id: entry.food_id || null,
  food_name: entry.food_name,
  quantity_g: number(entry.quantity_g),
  ...totals([entry]),
});

export function calculation(p) {
  const weight = number(p.weight),
    bmr =
      10 * weight +
      6.25 * number(p.height) -
      5 * number(p.age) +
      (p.sex === "male" ? 5 : -161);
  const base = { sedentary: 1.2, light: 1.3, moderate: 1.4, very_active: 1.5 }[
    p.activity
  ];
  const w = number(p.workouts),
    factor = Math.min(
      base + (w <= 1 ? 0 : w <= 3 ? 0.075 : w <= 5 ? 0.15 : 0.225),
      1.725,
    );
  return { bmr, factor };
}
export const mealByTime = (date = new Date()) =>
  date.getHours() < 11
    ? "breakfast"
    : date.getHours() < 16
      ? "lunch"
      : date.getHours() < 22
        ? "dinner"
        : "snack";
export const goalSignature = (goal) =>
  JSON.stringify([
    goal.goal_type,
    ...["training", "rest"].map((t) => targets(goal, t)),
  ]);
