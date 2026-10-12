import selection from "./voiceSelection.json";

// Missing transcripts are deliberately represented by neutral fragment labels.
export const POEMS = selection.map(
  ({ id, file, label, text, word, ...details }) => ({
    id,
    ...details,
    label,
    text: text || label,
    word: word || label,
    transcriptAvailable: Boolean(text && word),
    url: `${import.meta.env.BASE_URL || "/"}voices/${file}`,
  }),
);

export const FIREFLY_FRAGMENTS = Array.from({ length: 24 }, (_, i) => ({
  id: `firefly-${i + 1}`,
  label: `Fragment ${i + 1}`,
  word: `Fragment ${i + 1}`,
  url: `${import.meta.env.BASE_URL || "/"}voices/${String(i + 1).padStart(2, "0")}_Fragment_${i + 1}.mp3`,
}));
