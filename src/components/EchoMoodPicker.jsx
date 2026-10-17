import { useState } from "react";
import { MOOD_EMOJIS } from "../echoMood/echoMoodEngine.js";
import ArtisticIntroduction from "./ArtisticIntroduction.jsx";
export default function EchoMoodPicker({ onBloom, busy }) {
  const [selected, setSelected] = useState([]);
  return (
    <section className="echo-mood-picker" aria-labelledby="mood-title">
      <span className="artistic-eyebrow">OIZO •° / ÉchoMood</span>
      <h2 id="mood-title">Quel est ton ÉchoMood ?</h2>
      <p>
        Choisis 1 à 3 emojis. Des inspirations pour une matière, un mouvement,
        une musique.
      </p>
      <div
        className="mood-emojis"
        role="group"
        aria-label="Inspirations ÉchoMood"
      >
        {MOOD_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            aria-label={emoji}
            aria-pressed={selected.includes(emoji)}
            disabled={
              busy || (!selected.includes(emoji) && selected.length === 3)
            }
            onClick={() =>
              setSelected((old) =>
                old.includes(emoji)
                  ? old.filter((e) => e !== emoji)
                  : [...old, emoji],
              )
            }
          >
            {emoji}
          </button>
        ))}
      </div>
      <p className="mood-selection" aria-live="polite">
        {selected.length ? selected.join(" ") : "À toi de choisir"}
      </p>
      <button
        className="enter-landscape"
        disabled={!selected.length || busy}
        onClick={() => onBloom(selected)}
      >
        {busy ? "Éclosion…" : "Faire éclore mon OIZO"}
      </button>
      <small>Une interprétation artistique, sans diagnostic émotionnel.</small>
      <details className="artistic-about">
        <summary>La démarche artistique</summary>
        <ArtisticIntroduction />
      </details>
    </section>
  );
}
