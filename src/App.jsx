import { useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import ControlPanel from "./components/ControlPanel.jsx";
import { createSoundNest } from "./engine/createSoundNest.js";

export default function App() {
  const root = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      return createSoundNest(root.current);
    } catch (cause) {
      setError(
        `La scène 3D ne peut pas démarrer. Vérifiez que WebGL est activé dans votre navigateur. ${cause.message}`,
      );
    }
  }, []);

  return (
    <main ref={root}>
      <div id="stage" aria-label="Scène de peinture sonore 3D" />
      <Header />
      <div id="gyroHint" />
      <ControlPanel />
      {error && (
        <p role="alert" className="startup-error">
          {error}
        </p>
      )}
    </main>
  );
}
