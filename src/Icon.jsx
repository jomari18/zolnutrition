import React from "react";
const paths = {
  account: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  eyeOff: "M3 3l18 18M10 5c1-.3 2-.3 2-.3 6 0 10 7.3 10 7.3s-1 2-3 4M6 6c-3 2-4 6-4 6s4 7 10 7c2 0 4-.8 5-1.5M9 9a4 4 0 0 0 6 6",
  edit: "M14 5l5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14Z",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  copy: "M9 9h12v12H9ZM15 5V3H3v12h2",
  home: "M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9",
  meal: "M5 3v7m3-7v7M3 3v5a3 3 0 0 0 6 0V3M6 11v10M17 3v18M17 3c-4 3-4 8 0 8",
  saved: "M6 3h12v18l-6-4-6 4Z",
  progress: "M4 21V12h4v9M10 21V7h4v14M16 21V3h4v18",
  target: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0ZM12 10v4M10 12h4",
  protein: "M3 8v8M6 6v12M6 12h12M18 6v12M21 8v8",
  carbs: "M12 3v18M12 10C6 10 6 6 6 6c6 0 6 4 6 4Zm0 6c-6 0-6-4-6-4 6 0 6 4 6 4Zm0-6c6 0 6-4 6-4-6 0-6 4-6 4Zm0 6c6 0 6-4 6-4-6 0-6 4-6 4Z",
  fat: "M12 3c-3 5-7 8-7 12a7 7 0 0 0 14 0c0-4-4-7-7-12ZM9 16c0 2 1 3 3 3",
  flame: "M13 3c1 6 6 7 6 12a7 7 0 0 1-14 0c0-3 2-5 4-7 0 4 3 4 4-5Z",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  plus: "M12 5v14M5 12h14",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2",
};
export default function Icon({ name, ...props }) {
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.meal} /></svg>;
}
