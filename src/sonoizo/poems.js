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
