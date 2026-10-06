import React from "react";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "./ErrorBoundary";
import { DialogProvider } from "./Dialog";
import App from "./App";
import NativeShell from "./NativeShell";
import "./native.css";
import "./fonts.css";
import "./style.css";
import "./dashboard.css";
import "./screens.css";
import "./polish.css";
document.documentElement.dataset.theme =
  localStorage.getItem("znTheme") || "dark";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <DialogProvider>
        <NativeShell />
        <App />
      </DialogProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
