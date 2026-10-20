import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
const SquiggleApp = lazy(() => import("./squiggle/SquiggleApp.jsx"));
const DiskExperience = lazy(() => import("./emociel/DiskExperience.jsx"));
const OrbExperience = lazy(() => import("./emociel/OrbExperience.jsx"));
const ResonantPaint = lazy(() => import("./resonant/ResonantPaint.jsx"));
const ChillExperience = lazy(() => import("./chill/ChillExperience.jsx"));
const WatercolorWorkshop = lazy(() => import("./chill/WatercolorWorkshop.jsx"));
const App = lazy(() => import("./App.jsx"));
const SensoryExperience = lazy(
  () => import("./components/SensoryExperience.tsx"),
);
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Suspense fallback={<div role="status">Ouverture de l’atelier…</div>}>
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
      ) : new URLSearchParams(location.search).has("emociel") ? (
        <DiskExperience />
      ) : new URLSearchParams(location.search).has("cosmomood") ? (
        <SensoryExperience />
      ) : (
        <SquiggleApp />
      )}
    </Suspense>
  </React.StrictMode>,
);
