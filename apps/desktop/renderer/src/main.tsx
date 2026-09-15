import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "@/app/App";
import { initializeTheme } from "@/stores/theme-store";
import "./index.css";

void initializeTheme();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
