import { useEffect, useRef, useState } from "react";
import { BRUSHES } from "../engine/brushes.js";
import { createTwigBank, emptyTwigSnapshot } from "./createTwigBank.js";
import { createDefaultMelody } from "./createDefaultMelodies.js";
import { ENABLE_SONOIZO } from "./config.js";

const ids = BRUSHES.map((brush) => brush.id);
export function useTwigBank() {
  const bank = useRef(null);
  const [snapshot, setSnapshot] = useState(() => emptyTwigSnapshot(ids));
  const [error, setError] = useState("");
  useEffect(() => {
    if (!ENABLE_SONOIZO) return;
    let mounted = true;
    const owner = createTwigBank({
      ids,
      initialSamples:
        new URLSearchParams(location.search).get("samples") === "empty"
          ? []
          : ids.map((id, index) => [id, createDefaultMelody(index)]),
      onChange: (state) => {
        if (mounted) setSnapshot(state);
      },
      onError: (message) => {
        if (mounted) setError(message);
      },
    });
    bank.current = owner;
    setSnapshot(owner.getSnapshot());
    const interrupt = () => {
      owner.cancelRecording();
      owner.stopAll();
    };
    const hidden = () => {
      if (document.hidden) interrupt();
    };
    const blur = () => owner.stopAll();
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
