import fragments from "./poems.json";

export const POEMS = fragments.map(([id, text, word]) => ({
  id,
  text,
  word,
  url: `${import.meta.env.BASE_URL || "/"}poems/${id}.mp3`,
}));
