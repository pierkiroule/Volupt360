import type { SensoryWord } from "../transduction/types.ts";
/** Plutchik's eight-family theoretical model; vectors and hues below are artistic conventions,
 * not validated psychological measurements or universal emotion/colour correspondences.
 * Opposites occupy opposite petals. Source: Plutchik (2001), The Nature of Emotions.
 */
export interface EmotionTag extends SensoryWord {
  emoji: string;
  color: string;
  hue: number;
  opposite: string;
}
export const EMOTION_WHEEL: EmotionTag[] = [
  {
    id: "joie",
    label: "Joie",
    emoji: "😊",
    color: "#dbaf45",
    hue: 0.12,
    opposite: "tristesse",
    vector: [-0.7, 0.9, 0.8, 0.3, 0.8, 0.7, 0.3, 0.25],
  },
  {
    id: "confiance",
    label: "Confiance",
    emoji: "🤝",
    color: "#79b088",
    hue: 0.38,
    opposite: "degout",
    vector: [0.1, 0.5, 0.7, -0.6, 0.4, 0.95, 0.3, -0.7],
  },
  {
    id: "peur",
    label: "Peur",
    emoji: "😨",
    color: "#438e88",
    hue: 0.49,
    opposite: "colere",
    vector: [0.2, -0.6, -0.4, 0.55, -0.3, -0.2, 0.9, 0.55],
  },
  {
    id: "surprise",
    label: "Surprise",
    emoji: "😮",
    color: "#68a4c9",
    hue: 0.56,
    opposite: "anticipation",
    vector: [-0.3, 0.85, 0.15, 0.55, 0.7, -0.5, 0.6, 0.9],
  },
  {
    id: "tristesse",
    label: "Tristesse",
    emoji: "😢",
    color: "#7e89be",
    hue: 0.66,
    opposite: "joie",
    vector: [0.7, -0.2, 0.85, -0.65, -0.5, 0.75, 0.9, -0.25],
  },
  {
    id: "degout",
    label: "Dégoût",
    emoji: "😖",
    color: "#ad7cad",
    hue: 0.81,
    opposite: "confiance",
    vector: [0.25, -0.7, -0.35, 0.05, 0.2, -0.6, 0.2, 0.45],
  },
  {
    id: "colere",
    label: "Colère",
    emoji: "😠",
    color: "#cd7778",
    hue: 0.015,
    opposite: "peur",
    vector: [0.4, 0.65, -0.7, 0.85, 0.5, -0.4, 0.3, 0.65],
  },
  {
    id: "anticipation",
    label: "Anticipation",
    emoji: "👀",
    color: "#d99962",
    hue: 0.075,
    opposite: "surprise",
    vector: [-0.25, 0.55, 0.25, 0.2, 0.6, 0.55, 0.7, -0.1],
  },
];
export const emotionFor = (id: string) =>
  EMOTION_WHEEL.find((e) => e.id === id);
