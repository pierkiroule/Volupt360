import { withTimeout } from "./network.js";
export const API = "https://api.inaturalist.org/v1";
export const LICENSES = {
  cc0: {
    name: "CC0 1.0",
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
  "cc-by": {
    name: "CC BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
  },
};
export function mediaUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      [
        "static.inaturalist.org",
        "inaturalist-open-data.s3.amazonaws.com",
      ].includes(url.hostname)
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function recordings(observations, threatened = false) {
  const results = [];
  for (const observation of observations) {
    const taxon = observation.taxon;
    if (!taxon || taxon.rank !== "species" || !Number.isSafeInteger(taxon.id))
      continue;
    for (const sound of observation.sounds || []) {
      const license = String(sound.license_code || "").toLowerCase();
      const url = mediaUrl(sound.file_url);
      if (
        !LICENSES[license] ||
        !url ||
        !Number.isSafeInteger(sound.id) ||
        !Number.isSafeInteger(observation.id)
      )
        continue;
      results.push({
        observation: observation.id,
        sound: sound.id,
        taxon: taxon.id,
        species: taxon.name,
        commonName: taxon.preferred_common_name || taxon.name,
        author:
          sound.attribution ||
          observation.user?.name ||
          observation.user?.login ||
          "Contributeur iNaturalist",
        license,
        url,
        threatened,
        source: `https://www.inaturalist.org/observations/${observation.id}`,
      });
    }
  }
  return results;
}
export function assignRecordings(ids, candidates) {
  const used = new Set();
  const sorted = [...candidates].sort(
    (a, b) =>
      Number(b.threatened) - Number(a.threatened) ||
      a.taxon - b.taxon ||
      a.sound - b.sound,
  );
  const unique = sorted.filter((item) => {
    if (used.has(item.taxon)) return false;
    used.add(item.taxon);
    return true;
  });
  return Object.fromEntries(
    ids.map((id, index) => [id, unique[index] || null]),
  );
}
export async function fetchCatalog(ids, { signal, request = fetch } = {}) {
  const candidates = [];
  for (const threatened of [true, false]) {
    for (let page = 1; page <= 3; page++) {
      const params = new URLSearchParams({
        sounds: "true",
        taxon_id: "3",
        rank: "species",
        per_page: "100",
        page: String(page),
        order_by: "id",
        order: "desc",
      });
      if (threatened) params.set("threatened", "true");
      const data = await withTimeout(signal, async (timedSignal) => {
        let response;
        try {
          response = await request(`${API}/observations?${params}`, {
            signal: timedSignal,
          });
        } catch (error) {
          if (signal?.aborted) throw error;
          response = await request(
            `/api/bird-catalog?threatened=${threatened}&page=${page}`,
            { signal: timedSignal },
          );
        }
        if (!response.ok)
          throw new Error(
            `Catalogue iNaturalist indisponible (${response.status}).`,
          );
        return response.json();
      });
      candidates.push(...recordings(data.results || [], threatened));
      if (
        Object.values(assignRecordings(ids, candidates)).filter(Boolean)
          .length >= ids.length
      )
        return assignRecordings(ids, candidates);
      if ((data.results || []).length < 100) break;
    }
  }
  return assignRecordings(ids, candidates);
}

export function randomUnit() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] / 4294967296;
}
export async function drawRecording(
  excluded,
  { signal, request = fetch, random = randomUnit } = {},
) {
  const skipped = new Set(excluded);
  for (const threatened of [true, false]) {
    const pages = [1, 2, 3]; // Shuffle a finite API window; no claim of global uniformity.
    for (let i = pages.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pages[i], pages[j]] = [pages[j], pages[i]];
    }
    for (const page of pages) {
      const params = new URLSearchParams({
        sounds: "true",
        taxon_id: "3",
        rank: "species",
        per_page: "100",
        page: String(page),
        order_by: "id",
        order: "desc",
      });
      if (threatened) params.set("threatened", "true");
      const data = await withTimeout(signal, async (timedSignal) => {
        let response;
        try {
          response = await request(`${API}/observations?${params}`, {
            signal: timedSignal,
          });
        } catch (error) {
          if (signal?.aborted) throw error;
          response = await request(
            `/api/bird-catalog?threatened=${threatened}&page=${page}`,
            { signal: timedSignal },
          );
        }
        if (!response.ok)
          throw new Error(`Catalogue indisponible (${response.status}).`);
        return response.json();
      });
      const candidates = recordings(data.results || [], threatened).filter(
        (item) => !skipped.has(item.taxon),
      );
      if (candidates.length)
        return candidates[Math.floor(random() * candidates.length)];
    }
  }
  throw new Error(
    "Aucune nouvelle espèce avec un chant autorisé dans les pages disponibles.",
  );
}
