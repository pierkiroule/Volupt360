import React from "react";
import { createRoot } from "react-dom/client";
import ChillExperience from "./chill/ChillExperience.jsx";
import WatercolorWorkshop from "./chill/WatercolorWorkshop.jsx";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {new URLSearchParams(location.search).has("legacy") ||
    new URLSearchParams(location.search).has("classic") ? (
      <App />
    ) : new URLSearchParams(location.search).has("conte") ||
      new URLSearchParams(location.search).has("original") ? (
      <ChillExperience />
    ) : (
      <WatercolorWorkshop />
    )}
  </React.StrictMode>,
);
