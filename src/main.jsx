import DiskExperience from "./emociel/DiskExperience.jsx";
import OrbExperience from "./emociel/OrbExperience.jsx";
import ResonantPaint from "./resonant/ResonantPaint.jsx";
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
    ) : new URLSearchParams(location.search).has("atelier") ? (
      <WatercolorWorkshop />
    ) : new URLSearchParams(location.search).has("resonant") ||
      new URLSearchParams(location.search).has("peinture") ? (
      <ResonantPaint
        projective={!new URLSearchParams(location.search).has("resonant")}
      />
    ) : new URLSearchParams(location.search).has("bulle") ? (
      <OrbExperience />
    ) : (
      <DiskExperience />
    )}
  </React.StrictMode>,
);
