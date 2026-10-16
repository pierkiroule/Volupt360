import {
  drawNature,
  combineNatureProfile,
} from "../../materials/commonsNature.js";
import {
  analyzeBirdRecording,
  createBirdBrushProfile,
} from "./generativeBrush.js";
import { readAudioFeatures } from "../audioGraph.js";
import { fetchCatalog, drawRecording } from "./catalog.js";
import { recordingBytes, forgetMedia } from "./recordingCache.js";

export const BIRD_FADE = Object.freeze({ attack: 0.25, release: 0.7 });

export function createBirdSongs({
  ids,
  context,
  destination,
  onChange = () => {},
  request = fetch,
}) {
  let catalog = {},
    status = "idle",
    error = "",
    disposed = false,
    catalogTask = null,
    generation = 0,
    active = null,
    wanted = null;
  const abort = new AbortController(),
    decoded = new Map(),
    tails = new Set(),
    used = new Map();
  const profiles = new Map();
  let generatedMode = false,
    addTask = null;
  let playing = "",
    state = "idle";
  const emit = () => {
    if (!disposed) onChange();
  };
  const snapshot = () => ({
    status,
    error,
    playing,
    state,
    assignments: catalog,
    generated: generatedMode,
    profiles: Object.fromEntries(profiles),
    used: Object.fromEntries(used),
  });
  async function prepare(force = false) {
    if (generatedMode) return;
    if (catalogTask && (!force || status === "loading")) return catalogTask;
    status = "loading";
    error = "";
    emit();
    catalogTask = (async () => {
      try {
        let cached;
        try {
          cached = JSON.parse(localStorage.getItem("sonoizo-commons-audio-v2"));
        } catch {
          /* Optional cache. */
        }
        if (
          !force &&
          cached &&
          Date.now() - cached.time < 86400000 &&
          ids.every((id) => id in cached.catalog)
        )
          catalog = cached.catalog;
        else {
          catalog = await fetchCatalog(ids, { signal: abort.signal, request });
          try {
            localStorage.setItem(
              "sonoizo-commons-audio-v2",
              JSON.stringify({ time: Date.now(), catalog }),
            );
          } catch {
            /* Optional cache. */
          }
        }
        if (disposed) return;
        status = Object.values(catalog).some(Boolean) ? "ready" : "unavailable";
        if (status === "unavailable")
          error =
            "Aucun chant sous licence CC0 ou CC BY disponible. Les brosses restent silencieuses.";
      } catch (cause) {
        if (!disposed) {
          status = "error";
          error = `Chants indisponibles : ${cause.message}`;
          catalogTask = null;
        }
      } finally {
        emit();
      }
    })();
    return catalogTask;
  }
  function release(voice, seconds = BIRD_FADE.release) {
    if (!voice || tails.has(voice)) return;
    tails.add(voice);
    const now = voice.ctx.currentTime;
    voice.gain.gain.cancelAndHoldAtTime?.(now);
    if (!voice.gain.gain.cancelAndHoldAtTime) {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    }
    voice.gain.gain.linearRampToValueAtTime(0, now + seconds);
    voice.source.stop(now + seconds + 0.02);
  }
  function stop() {
    generation++;
    wanted = null;
    playing = "";
    state = "idle";
    release(active);
    active = null;
    emit();
  }
  let warmTask = null,
    warmId = null,
    warmSerial = 0;
  async function loadBuffer(item, ctx) {
    let buffer = decoded.get(item.sound);
    if (!buffer) {
      const bytes = await recordingBytes(item, {
        signal: abort.signal,
        request,
      });
      if (disposed) return null;
      let full;
      try {
        full = await ctx.decodeAudioData(bytes.slice(0));
      } catch (cause) {
        await forgetMedia(item);
        throw cause;
      }
      if (disposed) return null;
      if (!full.length || full.duration > 180 || full.numberOfChannels > 2)
        throw new Error("Durée ou format d’enregistrement non pris en charge.");
      const length = Math.min(full.length, Math.floor(ctx.sampleRate * 45));
      buffer = ctx.createBuffer(full.numberOfChannels, length, full.sampleRate);
      for (let channel = 0; channel < full.numberOfChannels; channel++)
        buffer.copyToChannel(
          full.getChannelData(channel).subarray(0, length),
          channel,
        );
      decoded.set(item.sound, buffer);
      while (decoded.size > 2) decoded.delete(decoded.keys().next().value);
    }
    return buffer;
  }
  async function warm(id) {
    const serial = ++warmSerial;
    await prepare();
    if (warmTask) await warmTask;
    if (disposed || serial !== warmSerial || !catalog[id]) return;
    warmId = catalog[id].sound;
    warmTask = loadBuffer(catalog[id], context()).catch(() => null);
    await warmTask;
    warmTask = null;
  }
  async function start(id) {
    if (disposed || (wanted === id && ["loading", "playing"].includes(state)))
      return;
    stop();
    wanted = id;
    const ticket = ++generation;
    state = "loading";
    emit();
    let ctx;
    try {
      ctx = context();
      await ctx.resume();
    } catch (cause) {
      if (!disposed && ticket === generation) {
        state = "error";
        error = `Lecture audio indisponible : ${cause.message}`;
        emit();
      }
      return;
    }
    await prepare();
    if (disposed || ticket !== generation) return;
    const item = catalog[id];
    if (!item) {
      state = "unavailable";
      error =
        "Aucun chant réel autorisé pour cette brosse. Aucun son de remplacement.";
      emit();
      return;
    }
    try {
      if (warmId === item.sound) await warmTask;
      const buffer = await loadBuffer(item, ctx);
      if (disposed || ticket !== generation) return;
      const source = ctx.createBufferSource(),
        gain = ctx.createGain(),
        analyser = ctx.createAnalyser();
      source.buffer = buffer;
      source.loop = true;
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(gain);
      gain.connect(analyser);
      analyser.connect(destination());
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(
        0.85,
        ctx.currentTime + BIRD_FADE.attack,
      );
      const voice = {
        ctx,
        source,
        gain,
        analyser,
        bins: new Uint8Array(analyser.frequencyBinCount),
        wave: new Uint8Array(analyser.fftSize),
        prev: new Float32Array(analyser.frequencyBinCount),
      };
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        analyser.disconnect();
        tails.delete(voice);
        if (active === voice) active = null;
      };
      active = voice;
      playing = id;
      state = "playing";
      error = "";
      source.start();
      used.set(item.sound, item);
      emit();
    } catch (cause) {
      if (!disposed && ticket === generation) {
        state = "error";
        error = `Chant indisponible (réseau, CORS ou format) : ${cause.message}`;
        emit();
      }
    }
  }
  async function generate(id) {
    if (disposed || !ids.includes(id)) return null;
    if (profiles.has(id))
      return { recording: catalog[id], profile: profiles.get(id) };
    if (addTask) return null;
    generatedMode = true;
    status = "loading";
    error = "";
    emit();
    addTask = (async () => {
      try {
        const excludedPhotos = [...profiles.values()]
          .map((profile) => profile.photo?.pageid)
          .filter(Boolean);
        const excluded = Object.values(catalog)
          .filter(Boolean)
          .map((item) => item.taxon);
        for (let attempt = 0; attempt < 3; attempt++) {
          const item = await drawRecording(excluded, {
            signal: abort.signal,
            request,
          });
          excluded.push(item.taxon);
          try {
            const buffer = await loadBuffer(item, context());
            if (disposed || !buffer) return null;
            const nature = await drawNature(excludedPhotos, {
              onCandidate: (pageid) => excludedPhotos.push(pageid),
              signal: abort.signal,
              request,
            });
            if (disposed) return null;
            const profile = combineNatureProfile(
              createBirdBrushProfile(item, analyzeBirdRecording(buffer)),
              nature,
            );
            catalog = { ...catalog, [id]: { ...item, photo: nature.photo } };
            profiles.set(id, profile);
            status = "ready";
            error = "";
            emit();
            return { recording: catalog[id], profile };
          } catch (cause) {
            if (attempt === 2 || disposed) throw cause;
          }
        }
      } catch (cause) {
        if (!disposed) {
          status = "error";
          error = `Nouvelle matière indisponible : ${cause.message}`;
          emit();
        }
        return null;
      } finally {
        addTask = null;
      }
    })();
    return addTask;
  }
  return {
    prepare,
    generate,
    warm,
    start,
    stop,
    snapshot,
    features() {
      const voice = active || [...tails][0];
      return voice ? readAudioFeatures(voice) : {};
    },
    dispose() {
      if (disposed) return;
      stop();
      disposed = true;
      abort.abort();
      for (const voice of tails) {
        voice.source.onended = null;
        try {
          voice.source.stop();
        } catch {}
        voice.source.disconnect();
        voice.gain.disconnect();
        voice.analyser.disconnect();
      }
      tails.clear();
      decoded.clear();
      catalog = {};
      used.clear();
      profiles.clear();
    },
  };
}
