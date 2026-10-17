import { useEffect, useRef, useState } from "react";
import { LANDSCAPE_BRUSHES } from "../materials/landscapePalette.js";
import { createTwigBank, emptyTwigSnapshot } from "./createTwigBank.js";
import { ENABLE_SONOIZO } from "./config.js";

const ids = LANDSCAPE_BRUSHES.map((brush) => brush.id);
export function useTwigBank() {
  const bank = useRef(null);
  const [snapshot, setSnapshot] = useState(() => emptyTwigSnapshot(ids));
  const [error, setError] = useState("");
  useEffect(() => {
    if (!ENABLE_SONOIZO) return;
    let mounted = true;
    const owner = createTwigBank({
      ids,
      onChange: (state) => {
        if (mounted) setSnapshot(state);
      },
      onError: (message) => {
        if (mounted) setError(message);
      },
    });
    bank.current = owner;
    setSnapshot(owner.getSnapshot());
    if (new URLSearchParams(location.search).get("samples") !== "empty") {
      owner.enableFireflies();
    }
    const interrupt = () => {
      owner.cancelRecording();
      owner.stopAll();
    };
    const hidden = () => {
      if (document.hidden) {
        interrupt();
        owner.pauseAmbience();
      }
    };
    const blur = () => {
      owner.stopAll();
      owner.pauseAmbience();
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      mounted = false;
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
      owner.dispose();
      bank.current = null;
    };
  }, []);
  return { bank, snapshot, error, clearError: () => setError("") };
}
