import { EMOTION_WHEEL, emotionFor } from "../data/emotionWheel.ts";
import { useSensoryStore } from "../store/useSensoryStore.ts";
function point(radius: number, angle: number) {
  const a = (angle * Math.PI) / 180;
  return [200 + Math.cos(a) * radius, 200 + Math.sin(a) * radius];
}
function petal(index: number) {
  const a = index * 45 - 112.5,
    b = a + 45;
  const p = point(190, a + 1),
    q = point(190, b - 1),
    r = point(78, b - 1),
    s = point(78, a + 1);
  return `M${p} A190 190 0 0 1 ${q} L${r} A78 78 0 0 0 ${s} Z`;
}
export default function EmotionWheel() {
  const { composition, setWords } = useSensoryStore(),
    words = composition.words;
  return (
    <>
      <div
        className="cosmo-wheel"
        role="group"
        aria-label="Roue des émotions — choisir une à trois émotions"
      >
        <svg viewBox="0 0 400 400" aria-hidden="true">
          {EMOTION_WHEEL.map((emotion, i) => (
            <path
              key={emotion.id}
              d={petal(i)}
              fill={emotion.color}
              fillOpacity={words.some((w) => w.id === emotion.id) ? 0.72 : 0.23}
              stroke={emotion.color}
              strokeOpacity={words.some((w) => w.id === emotion.id) ? 1 : 0.2}
              strokeWidth={words.some((w) => w.id === emotion.id) ? 2 : 1}
            />
          ))}
        </svg>
        {EMOTION_WHEEL.map((emotion, i) => {
          const selected = words.some((w) => w.id === emotion.id),
            p = point(135, i * 45 - 90);
          return (
            <button
              className="cosmo-petal"
              key={emotion.id}
              style={{ left: `${p[0] / 4}%`, top: `${p[1] / 4}%` }}
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
        <div className="cosmo-wheel-center" aria-live="polite">
          <span>
            {words.length
              ? words.map((w) => emotionFor(w.id)?.emoji ?? "◌").join(" ")
              : "•°"}
          </span>
          <small>{words.length}/3 émotions</small>
        </div>
      </div>
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
      <details className="cosmo-wheel-note">
        <summary>À propos de cette roue</summary>
        <p>
          Adaptation artistique des huit familles du modèle de Robert Plutchik.
          Plusieurs émotions peuvent coexister. Les mots, couleurs et symboles
          sont des repères à s’approprier, pas des mesures de ton état ni un
          test psychologique.
        </p>
        <p>
          La roue n’est pas un outil validé pour diagnostiquer ou mesurer les
          émotions de tous les publics. Les effets visuels et sonores sont des
          choix artistiques.
        </p>
        <a
          href="https://www.americanscientist.org/article/the-nature-of-emotions"
          target="_blank"
          rel="noreferrer"
        >
          Repère théorique : Plutchik, The Nature of Emotions (2001)
        </a>
      </details>
    </>
  );
}
