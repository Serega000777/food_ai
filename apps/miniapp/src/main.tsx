import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles/global.css";
import { applyThemePreference, getThemePreference } from "./utils/theme";

// Applied before first paint so a stored dark/light override doesn't flash the
// system-default theme first.
applyThemePreference(getThemePreference());

const container = document.getElementById("root");
if (!container) throw new Error("#root element not found");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
