import type {
  SensoryComposition,
  WordChoice,
  SensoryVector,
} from "../transduction/types.ts";
import { hashText } from "../transduction/engine.ts";
export function validateComposition(input: unknown): SensoryComposition {
  if (!input || typeof input !== "object")
    throw Error("Composition illisible.");
  const obj = input as Record<string, unknown>;
  if (
    obj.version !== 1 ||
    !Number.isInteger(obj.seed) ||
    Number(obj.seed) < 0 ||
    Number(obj.seed) > 4294967295
  )
    throw Error("Format ou graine de composition invalide.");
  if (!Array.isArray(obj.words) || obj.words.length > 5)
    throw Error("Une composition contient au maximum cinq mots.");
  const ids = new Set<string>();
  const words: WordChoice[] = obj.words.map((raw: unknown) => {
    if (!raw || typeof raw !== "object") throw Error("Mot invalide.");
    const w = raw as Record<string, unknown>;
    if (
      typeof w.id !== "string" ||
      !/^[a-z0-9-]{1,64}$/.test(w.id) ||
      ids.has(w.id)
    )
      throw Error("Identifiant de mot invalide ou répété.");
    ids.add(w.id);
    if (
      typeof w.label !== "string" ||
      !w.label.trim() ||
      w.label.length > 40 ||
      /[\u0000-\u001f]/.test(w.label)
    )
      throw Error("Libellé de mot invalide.");
    if (
      typeof w.intensity !== "number" ||
      !Number.isFinite(w.intensity) ||
      w.intensity < 0 ||
      w.intensity > 100
    )
      throw Error("Intensité hors limites.");
    if (
      !Array.isArray(w.vector) ||
      w.vector.length !== 8 ||
      w.vector.some(
        (v) => typeof v !== "number" || !Number.isFinite(v) || v < -1 || v > 1,
      )
    )
      throw Error("Vecteur sensoriel invalide.");
    return {
      id: w.id,
      label: w.label.normalize("NFC").trim(),
      intensity: w.intensity,
      vector: [...w.vector] as SensoryVector,
      ...(w.custom === true ? { custom: true } : {}),
    };
  });
  return { version: 1, seed: Number(obj.seed), words };
}
export function serializeComposition(c: SensoryComposition) {
  const v = validateComposition(c);
  return JSON.stringify({
    ...v,
    words: [...v.words].sort((a, b) => a.id.localeCompare(b.id)),
  });
}
export function parseComposition(text: string) {
  if (text.length > 32000)
    throw Error("Ce fichier dépasse la taille autorisée.");
  return validateComposition(JSON.parse(text));
}
export function customWord(label: string): WordChoice {
  const clean = label
    .normalize("NFC")
    .replace(/[\u0000-\u001f]/g, "")
    .trim()
    .slice(0, 40);
  if (!clean) throw Error("Écris ton mot.");
  return {
    id: `custom-${hashText(clean.toLocaleLowerCase()).toString(16)}`,
    label: clean,
    intensity: 60,
    vector: [0, 0, 0, 0, 0, 0, 0, 0],
    custom: true,
  };
}
export function encodeComposition(c: SensoryComposition) {
  const bytes = new TextEncoder().encode(serializeComposition(c));
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export function decodeComposition(encoded: string) {
  if (encoded.length > 3500 || !/^[A-Za-z0-9_-]+$/.test(encoded))
    throw Error("Lien de composition invalide.");
  const raw = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
  return parseComposition(
    new TextDecoder().decode(Uint8Array.from(raw, (c) => c.charCodeAt(0))),
  );
}
export function shareLink(c: SensoryComposition) {
  const code = encodeComposition(c);
  if (code.length > 3500)
    throw Error(
      "Composition trop longue pour un lien ; utilise le fichier JSON.",
    );
  return `${location.origin}${location.pathname}#c=${code}`;
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
