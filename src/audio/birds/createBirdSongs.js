import { readAudioFeatures } from "../audioGraph.js";
import { fetchCatalog } from "./catalog.js";
import { recordingBytes } from "./recordingCache.js";

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
    used: Object.fromEntries(used),
  });
  async function prepare(force = false) {
    if (catalogTask && (!force || status === "loading")) return catalogTask;
    status = "loading";
    error = "";
    emit();
    catalogTask = (async () => {
      try {
        let cached;
        try {
          cached = JSON.parse(localStorage.getItem("sonoizo-bird-catalog-v1"));
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
              "sonoizo-bird-catalog-v1",
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
  function release(voice, seconds = 0.65) {
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
      const full = await ctx.decodeAudioData(bytes.slice(0));
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
      gain.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 0.18);
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
  return {
    prepare,
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
    },
  };
}
