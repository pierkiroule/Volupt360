import { LEARNING_TOPICS, LEARNING_SECONDS } from "./learningContent.js";
export const PROGRESS_KEY = "oizo.poetic-learning.v1";
export function cleanProgress(value) {
  const opened = {};
  for (const topic of LEARNING_TOPICS) {
    const list = value?.opened?.[topic.id];
    opened[topic.id] = Array.isArray(list)
      ? [0, 1, 2].filter((i) => list.includes(i))
      : [];
    // The sequence is pedagogical: a stored discovery cannot skip its mystery.
    opened[topic.id] = opened[topic.id].filter((i, _, a) => {
      for (let j = 0; j < i; j++) if (!a.includes(j)) return false;
      return true;
    });
  }
  const encountered = LEARNING_TOPICS.filter(
    (t) =>
      opened[t.id].length === 3 ||
      (Array.isArray(value?.encountered) && value.encountered.includes(t.id)),
  ).map((t) => t.id);
  return {
    version: 1,
    elapsed: Number.isFinite(value?.elapsed)
      ? Math.max(0, Math.min(86400, value.elapsed))
      : 0,
    opened,
    encountered,
    visited: [...encountered],
  };
}
export function loadProgress(storage) {
  try {
    return cleanProgress(
      JSON.parse((storage || window.localStorage).getItem(PROGRESS_KEY)),
    );
  } catch {
    return cleanProgress(null);
  }
}
export function saveProgress(progress, storage) {
  try {
    (storage || window.localStorage).setItem(
      PROGRESS_KEY,
      JSON.stringify(cleanProgress(progress)),
    );
    return true;
  } catch {
    return false;
  }
}
export function journeyProgress(progress) {
  return Math.min(1, progress.elapsed / LEARNING_SECONDS);
}
