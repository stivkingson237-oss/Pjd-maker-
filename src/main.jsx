import React from "react";
import { createRoot } from "react-dom/client";
import "./responsive.css";
import "./marketplace.css";
import "./marketplace-extra.css";
import "./interface-overrides.css";
import App from "./App.jsx";

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);