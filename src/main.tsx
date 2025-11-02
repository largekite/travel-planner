import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import PlannerRedesign from "./index";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PlannerRedesign />
  </React.StrictMode>
);
