import React, { useEffect, useRef, useState } from "react";
import { balance } from "./lib";
import { round } from "./ui";
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}
export function AnimatedNumber({ value }) {
  const reduced = useReducedMotion(),
    [display, setDisplay] = useState(value),
    current = useRef(value);
  useEffect(() => {
    if (reduced) {
      current.current = value;
      setDisplay(value);
      return;
    }
    const from = current.current,
      start = performance.now(),
      duration =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--duration-standard",
          ),
        ) || 200;
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      current.current = from + (value - from) * (1 - (1 - t) ** 3);
      setDisplay(current.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);
  return (
    <>
      <span aria-hidden="true">{round(display)}</span>
      <span className="sr-only">{round(value)}</span>
    </>
  );
}
export function NutritionBar({ name, consumed, target, pulse = true }) {
  const b = balance(consumed, target),
    previous = useRef(consumed),
    reached = useRef(false),
    [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (
      pulse &&
      !reached.current &&
      target > 0 &&
      previous.current < target &&
      consumed >= target
    ) {
      reached.current = true;
      setCelebrate(true);
    }
    previous.current = consumed;
  }, [consumed, target, pulse]);
  const text = `${round(b.consumed)} consumed, ${round(b.target)} target, ${b.over ? round(b.over) + " over" : round(b.remaining) + " remaining"}`;
  return (
    <div
      className={`nutrition-bar ${b.over ? "exceeded" : ""} ${celebrate ? "reached" : ""}`}
      data-k={name}
      role="progressbar"
      aria-label={name}
      aria-valuemin={0}
      aria-valuemax={Math.max(1, b.target)}
      aria-valuenow={Math.min(b.consumed, Math.max(1, b.target))}
      aria-valuetext={text}
      onAnimationEnd={() => setCelebrate(false)}
    >
      <span style={{ transform: `scaleX(${b.ratio})` }} />
    </div>
  );
}
export function Skeleton({ label = "Loading your data", rows = 3 }) {
  return (
    <div className="skeleton-group" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}
export function AnimatedRow({ children, removing, index = 0 }) {
  return (
    <div
      className={`row-shell ${removing ? "removing" : ""}`}
      aria-hidden={removing || undefined}
      inert={removing || undefined}
      style={{ "--row-index": Math.min(index, 4) }}
    >
      <div className="row-inner">{children}</div>
    </div>
  );
}
