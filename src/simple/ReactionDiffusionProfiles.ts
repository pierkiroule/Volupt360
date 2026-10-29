/** Three tested Gray–Scott regimes, used as artistic materials, not diagnoses. */
export const REACTION_PROFILES = {
  islands: { feed: 0.035, kill: 0.062 },
  rivers: { feed: 0.022, kill: 0.051 },
  meanders: { feed: 0.045, kill: 0.061 },
} as const;
const FAMILIES: Record<string, keyof typeof REACTION_PROFILES> = {
  warm: "islands",
  water: "rivers",
  night: "meanders",
  air: "meanders",
  soft: "meanders",
  spark: "islands",
  wonder: "islands",
  surprise: "islands",
  confused: "meanders",
  tired: "rivers",
  trust: "islands",
  longing: "rivers",
};
export function reactionProfiles(ids: readonly string[]) {
  const selected = [...new Set(ids)].filter((id) => FAMILIES[id]).slice(0, 3);
  if (!selected.length) selected.push("warm");
  return selected.map((id) => REACTION_PROFILES[FAMILIES[id]]);
}
