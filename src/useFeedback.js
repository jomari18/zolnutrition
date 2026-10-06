import { useCallback, useEffect, useRef, useState } from "react";
import { friendlyError } from "./errors";
export default function useFeedback() {
  const [notices, setNotices] = useState([]), [busy, setBusy] = useState(false);
  const lock = useRef(false), sequence = useRef(0);
  const notify = useCallback((value, error = false) => {
    const message = error ? friendlyError(value) : value;
    const next = { message, error, id: ++sequence.current };
    setNotices(old => error
      ? old.some(n => n.error && n.message === message) ? old : [...old.filter(n => n.error), next]
      : [...old.filter(n => n.error), next]);
  }, []);
  const success = notices.find(n => !n.error);
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setNotices(old => old.filter(n => n.id !== success.id)), 3500);
    return () => clearTimeout(timer);
  }, [success]);
  const run = async (fn, text) => {
    if (lock.current) return false;
    lock.current = true; setBusy(true);
    try {
      if ((await fn()) === false) return false;
      notify(text || "Saved."); return true;
    } catch (e) { notify(e, true); return false; }
    finally { lock.current = false; setBusy(false); }
  };
  return { notices, notice: notices.find(n => n.error) || success, notify, busy, run,
    dismiss: id => setNotices(old => id === undefined ? [] : old.filter(n => n.id !== id)) };
}
