import { useEffect, useRef, useState } from "react";
// Defer the database delete; undo requires no reinsertion and preserves IDs.
export default function useUndoDelete(notify) {
  const [pending, setPending] = useState(null),
    current = useRef(null),
    timer = useRef(null);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      current.current = null;
    },
    [],
  );
  const schedule = (kind, id, label, commit) => {
    if (current.current) return;
    const job = { kind, id, label, committing: false };
    current.current = job;
    setPending(job);
    timer.current = setTimeout(async () => {
      if (current.current !== job) return;
      current.current = { ...job, committing: true };
      setPending(current.current);
      try {
        await commit();
        notify(`${label} deleted.`, false);
      } catch (e) {
        notify(e, true);
      } finally {
        current.current = null;
        setPending(null);
      }
    }, 5000);
  };
  const undo = () => {
    if (current.current?.committing) return;
    clearTimeout(timer.current);
    current.current = null;
    setPending(null);
    notify("Deletion undone.", false);
  };
  return { pending, schedule, undo };
}
