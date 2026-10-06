import { askAlert } from "./alerts.js";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
} from "react";
import { createPortal } from "react-dom";
const Context = createContext(null);
export function Dialog({ title, children, onClose, sheet = false, closeDisabled = false }) {
  const ref = useRef(null),
    close = useRef(onClose),
    id = useId();
  close.current = onClose;
  useEffect(() => {
    const el = ref.current,
      previous = document.activeElement;
    el.showModal();
    const focus =
      el.querySelector("input:not([disabled]), select:not([disabled])") ||
      el.querySelector("button:not([disabled])");
    (focus || el).focus();
    const trap = (e) => {
      if (e.key !== "Tab") return;
      const nodes = [
        ...el.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]',
        ),
      ].filter((n) => n.getClientRects().length);
      if (!nodes.length) {
        e.preventDefault();
        el.focus();
        return;
      }
      if (e.shiftKey && document.activeElement === nodes[0]) {
        e.preventDefault();
        nodes.at(-1).focus();
      } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
        e.preventDefault();
        nodes[0].focus();
      }
    };
    el.addEventListener("keydown", trap);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el.removeEventListener("keydown", trap);
      el.close();
      document.body.style.overflow = overflow;
      requestAnimationFrame(() => {
        if (previous?.isConnected) previous.focus();
      });
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className={`panel dialog ${sheet ? "sheet" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={id}
      tabIndex={-1}
      onCancel={(e) => {
        e.preventDefault();
        close.current();
      }}
    >
      <div className="spread">
        <h2 id={id}>{title}</h2>
        <button type="button" aria-label="Close dialog" disabled={closeDisabled} onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>,
    document.body,
  );
}
export function DialogProvider({ children }) {
  const ask = useCallback(options => askAlert(options), []);
  return <Context.Provider value={ask}>{children}</Context.Provider>;
}
export const useDialog = () => useContext(Context);
