import { useRef } from "react";
import { allRows, result, sb } from "./client";
import { mealRow, shiftDate, totals } from "./lib";
import { userError } from "./errors";
export default function useMealActions({
  uid,
  day,
  entries,
  items,
  setHistory,
  setFoods,
  setSaved,
  setItems,
  ask,
}) {
  const copied = useRef(new Set());
  const insert = async (rows) => {
    const created = await result(sb.from("meal_entries").insert(rows).select());
    setHistory((old) =>
      [...created, ...old].sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      ),
    );
  };
  const row = (i, meal = i.meal_type) => mealRow(i, uid, day, meal);
  const add = async (data, saveFood) => {
    let food = null;
    if (saveFood)
      food = await result(
        sb
          .from("foods")
          .insert({
            user_id: uid,
            name: data.food_name,
            serving_size_g: data.quantity_g,
            ...totals([data]),
          })
          .select()
          .single(),
      );
    try {
      await insert({ ...row(data), food_id: food?.id || data.food_id || null });
    } catch (error) {
      if (food) {
        const { error: cleanupError } = await sb
          .from("foods")
          .delete()
          .eq("id", food.id)
          .eq("user_id", uid)
          .select("id")
          .single();
        if (cleanupError) {
          setFoods((old) => [...old, food]);
          throw userError(
            "The meal could not be confirmed and its reusable food is still saved. Check your log before retrying; choose that food without 'Save for reuse'.",
          );
        }
      }
      throw error;
    }
    if (food) setFoods((old) => [...old, food]);
  };
  const copy = async (meal) => {
    const key = day + ":" + (meal || "all");
    if (copied.current.has(key) || copied.current.has(day + ":all"))
      throw userError("Already copied to this date in this session.");
    const existing = await allRows(() =>
      sb
        .from("meal_entries")
        .select("id,meal_type")
        .eq("user_id", uid)
        .eq("logged_date", day)
        .order("id"),
    );
    if (
      existing.some((i) => !meal || i.meal_type === meal) &&
      !(await ask({
        title: "Add to existing meals?",
        message: `This date already has ${meal || "meal"} entries. Copying from ${shiftDate(day, -1)} may duplicate food.`,
        action: "Copy anyway",
      }))
    )
      return false;
    const yesterday = await allRows(() =>
      sb
        .from("meal_entries")
        .select("*")
        .eq("user_id", uid)
        .eq("logged_date", shiftDate(day, -1))
        .order("id"),
    );
    const selected = yesterday.filter((i) => !meal || i.meal_type === meal);
    if (!selected.length)
      throw userError(`No matching meals on ${shiftDate(day, -1)}.`);
    await insert(selected.map((i) => row(i)));
    copied.current.add(key);
  };
  const saveMeal = async (meal) => {
    const selected = entries.filter((i) => i.meal_type === meal);
    if (!selected.length) return false;
    const name = await ask({
      title: "Save meal",
      message: "Name this meal for quick logging later.",
      input: true,
      action: "Save meal",
    });
    if (!name) return false;
    const saved = await result(
      sb.from("saved_meals").insert({ user_id: uid, name }).select().single(),
    );
    let created;
    try {
      created = await result(
        sb
          .from("saved_meal_items")
          .insert(
            selected.map((i, n) => {
              const { logged_date, meal_type, ...data } = row(i);
              return { ...data, saved_meal_id: saved.id, sort_order: n };
            }),
          )
          .select(),
      );
    } catch (e) {
      const { error } = await sb
        .from("saved_meals")
        .delete()
        .eq("id", saved.id)
        .eq("user_id", uid)
        .select("id")
        .single();
      if (error) {
        setSaved((old) => [saved, ...old]);
        throw userError(
          "Meal items weren't saved and an empty saved meal may remain. Refresh saved meals and remove it before retrying.",
        );
      }
      throw e;
    }
    setSaved((old) => [saved, ...old]);
    setItems((old) => [...old, ...created]);
  };
  const logSaved = async (id, meal) => {
    const selected = items.filter(
      (i) => String(i.saved_meal_id) === String(id),
    );
    if (!selected.length)
      throw userError("This meal has no items. Log a meal and save it again.");
    await insert(selected.map((i) => row(i, meal)));
  };
  const deleteEntry = async (id) => {
    await result(
      sb
        .from("meal_entries")
        .delete()
        .eq("id", id)
        .eq("user_id", uid)
        .select("id")
        .single(),
    );
    setHistory((old) => old.filter((i) => i.id !== id));
  };
  const deleteSaved = async (id) => {
    await result(
      sb
        .from("saved_meals")
        .delete()
        .eq("id", id)
        .eq("user_id", uid)
        .select("id")
        .single(),
    );
    setSaved((old) => old.filter((i) => i.id !== id));
    setItems((old) => old.filter((i) => i.saved_meal_id !== id));
  };
  return { add, copy, saveMeal, logSaved, deleteEntry, deleteSaved };
}
