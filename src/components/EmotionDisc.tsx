import { Component, lazy, Suspense, useState, type ReactNode } from "react";
import { EMOTION_WHEEL, emotionFor } from "../data/emotionWheel.ts";
import { useSensoryStore } from "../store/useSensoryStore.ts";
const Scene = lazy(() => import("../scene/SensoryScene.tsx"));
const noCapture = () => {};
class PreviewBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="cosmo-orb-placeholder" />
    ) : (
      this.props.children
    );
  }
}
export default function EmotionDisc() {
  const [failed, setFailed] = useState(false);
  const { composition, setWords, birth } = useSensoryStore(),
    words = composition.words;
  return (
    <>
      <div
        className="cosmo-emotion-disc"
        role="group"
        aria-label="Disque émotionnel — choisir une à trois émotions"
      >
        <button
          className="cosmo-orb"
          aria-label="Entrer dans mon univers"
          disabled={!words.length || words.length > 3}
          onClick={birth}
        >
          <div className="cosmo-orb-scene">
            <Suspense fallback={<div className="cosmo-orb-placeholder" />}>
              <PreviewBoundary>
                {failed ? (
                  <div className="cosmo-orb-placeholder" />
                ) : (
                  <Scene
                    preview
                    onCapture={noCapture}
                    onFailure={() => setFailed(true)}
                  />
                )}
              </PreviewBoundary>
            </Suspense>
          </div>
          <span className="cosmo-orb-glass" aria-hidden="true" />
          <span className="cosmo-orb-invitation">
            {words.length ? "Toucher pour entrer" : "Choisis tes émotions"}
          </span>
        </button>
        {EMOTION_WHEEL.map((emotion, i) => {
          const angle = (i * Math.PI) / 4 - Math.PI / 2,
            selected = words.some((w) => w.id === emotion.id);
          return (
            <button
              className="cosmo-emoji-orbit"
              key={emotion.id}
              style={
                {
                  left: `${50 + Math.cos(angle) * 43}%`,
                  top: `${50 + Math.sin(angle) * 43}%`,
                  "--tag-color": emotion.color,
                } as React.CSSProperties
              }
              aria-label={emotion.label}
              aria-pressed={selected}
              disabled={words.length >= 3 && !selected}
              onClick={() =>
                setWords(
                  selected
                    ? words.filter((w) => w.id !== emotion.id)
                    : [
                        ...words,
                        {
                          id: emotion.id,
                          label: emotion.label,
                          vector: [...emotion.vector],
                          intensity: 70,
                        },
                      ],
                )
              }
            >
              <span aria-hidden="true">{emotion.emoji}</span>
              <small>{emotion.label}</small>
            </button>
          );
        })}
      </div>
      <p className="cosmo-selection-count" aria-live="polite">
        {words.length}/3 émotions ·{" "}
        {words.length
          ? words.map((w) => w.label).join(" · ")
          : "Un monde à faire naître"}
      </p>
      <div className="cosmo-selection" aria-label="Émotions choisies">
        {words.map((word) => (
          <div key={word.id}>
            <label htmlFor={`emotion-${word.id}`}>
              {emotionFor(word.id)?.emoji ?? "◌"} {word.label}
            </label>
            <input
              id={`emotion-${word.id}`}
              aria-label={`Présence ${word.label}`}
              type="range"
              min="0"
              max="100"
              value={word.intensity}
              onChange={(e) =>
                setWords(
                  words.map((w) =>
                    w.id === word.id
                      ? { ...w, intensity: Number(e.target.value) }
                      : w,
                  ),
                )
              }
            />
            <button
              aria-label={`Retirer ${word.label}`}
              onClick={() => setWords(words.filter((w) => w.id !== word.id))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <p className="cosmo-art-note">
        Des correspondances artistiques, sans diagnostic. À toi d’y donner du
        sens.
      </p>
    </>
  );
}
