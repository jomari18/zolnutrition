import { useEffect, useState } from "react";
import { allRows, sb } from "./client";
import { shiftDate } from "./lib";
export default function useNutritionData(uid, day, notify) {
  const [history, setHistory] = useState([]),
    [foods, setFoods] = useState([]),
    [saved, setSaved] = useState([]),
    [items, setItems] = useState([]),
    [weights, setWeights] = useState([]);
  const [loading, setLoading] = useState(true),
    [readyDay, setReadyDay] = useState(null),
    [historyError, setHistoryError] = useState(false),
    [libraryLoading, setLibraryLoading] = useState(true),
    [weightsLoading, setWeightsLoading] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    setLoading(true);
    setHistoryError(false);
    allRows(() =>
      sb
        .from("meal_entries")
        .select("*")
        .eq("user_id", uid)
        .gte("logged_date", shiftDate(day, -89))
        .lte("logged_date", day)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .abortSignal(controller.signal),
    )
      .then((rows) => {
        if (alive) {
          setHistory(rows);
          setReadyDay(day);
        }
      })
      .catch((e) => {
        if (alive) {
          setHistoryError(true);
          notify(e, true);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [uid, day, revision, notify]);
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    setLibraryLoading(true);
    // Only reload on account change or an explicit retry, not saved-meal edits.
    Promise.all([
      allRows(() =>
        sb
          .from("foods")
          .select("*")
          .order("name")
          .order("id")
          .abortSignal(controller.signal),
      ),
      allRows(() =>
        sb
          .from("saved_meals")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .order("id")
          .abortSignal(controller.signal),
      ),
      allRows(() =>
        sb
          .from("saved_meal_items")
          .select("*")
          .eq("user_id", uid)
          .order("id")
          .abortSignal(controller.signal),
      ),
    ])
      .then(([f, s, i]) => {
        if (alive) {
          setFoods(f);
          setSaved(s);
          setItems(i.sort((a, b) => a.sort_order - b.sort_order));
        }
      })
      .catch((e) => {
        if (alive) notify(e, true);
      })
      .finally(() => {
        if (alive) setLibraryLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [uid, revision, notify]);
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    setWeightsLoading(true);
    allRows(() =>
      sb
        .from("weight_logs")
        .select("weight_kg,logged_date")
        .eq("user_id", uid)
        .order("logged_date")
        .abortSignal(controller.signal),
    )
      .then((rows) => {
        if (alive) setWeights(rows);
      })
      .catch((e) => {
        if (alive) notify(e, true);
      })
      .finally(() => {
        if (alive) setWeightsLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [uid, revision, notify]);
  return {
    history,
    setHistory,
    foods,
    setFoods,
    saved,
    setSaved,
    items,
    setItems,
    weights,
    setWeights,
    loading: loading || (readyDay !== day && !historyError),
    historyError,
    libraryLoading,
    weightsLoading,
    reload: () => setRevision((n) => n + 1),
  };
}
