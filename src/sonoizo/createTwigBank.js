import { readAudioFeatures } from "../audio/audioGraph.js";

export const MAX_TWIG_SECONDS = 5;
const SAMPLE_RATE = 24000;
const HOLD_DELAY = 300;

export function emptyTwigSnapshot(ids) {
  return {
    recording: null,
    slots: Object.fromEntries(
      ids.map((id) => [id, { duration: 0, playing: false, looping: false }]),
    ),
  };
}

/** Session-local, mono sample bank. No monitoring or uploads; exposes per-pad acoustic features. */
export function createTwigBank({
  ids,
  onChange = () => {},
  onError = () => {},
  initialSamples = [],
}) {
  if (ids.length > 12 || new Set(ids).size !== ids.length)
    throw new Error("Invalid twig slots");
  let fireflies = false;
  const brushGestures = new Map();
  const poems = new Map();
  let poemRequest = 0,
    poemLoading = false,
    poemAbort = null,
    ambience = null,
    ambienceRequest = 0,
    ambienceLoading = false,
    pendingAmbience = null;
  const buffers = new Map(),
    voices = new Map(),
    gestures = new Map();
  let ctx,
    master,
    pendingVocal = null,
    captureProcessor,
    captureSink,
    captureTap,
    capturePending = false,
    recording = null,
    revision = 0,
    playbackRevision = 0,
    triggerSerial = 0,
    disposed = false;
  // AudioBuffer construction stays silent and does not create an audio context.
  for (const [id, sample] of initialSamples) {
    if (!ids.includes(id)) continue;
    const buffer = new AudioBuffer({
      length: sample.data.length,
      sampleRate: sample.sampleRate,
      numberOfChannels: 1,
    });
    buffer.copyToChannel(sample.data, 0);
    buffers.set(id, buffer);
  }
  function snapshot() {
    return {
      recording: recording
        ? {
            id: recording.id,
            status: recording.status,
            startedAt: recording.startedAt,
          }
        : null,
      poemLoading,
      fireflies,
      activeVocalId: [...voices.keys()][0] || pendingVocal?.id || null,
      vocalBusy: poems.size > 0 && (voices.size > 0 || pendingVocal !== null),
      ambience: {
        name: ambience?.name || "",
        loaded: Boolean(ambience),
        playing: Boolean(ambience && !ambience.element.paused),
        loading: ambienceLoading,
      },
      slots: Object.fromEntries(
        ids.map((id) => [
          id,
          {
            text: poems.get(id)?.text || "",
            word: poems.get(id)?.word || "",
            duration: fireflies ? 1 : buffers.get(id)?.duration || 0,
            playing: fireflies
              ? [...brushGestures.values()].some((g) => g.id === id)
              : voices.has(id),
            looping: voices.get(id)?.source.loop || false,
          },
        ]),
      ),
    };
  }
  const emit = () => {
    if (!disposed) onChange(snapshot());
  };
  function context() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.connect(ctx.destination);
      connectCapture();
    }
    return ctx;
  }
  function captured(data, rate, audioTime) {
    const stamp = ctx.getOutputTimestamp?.();
    const startTime =
      stamp?.performanceTime > 0
        ? stamp.performanceTime + (audioTime - stamp.contextTime) * 1000
        : performance.now() + (audioTime - ctx.currentTime) * 1000;
    captureTap?.(data, rate, startTime);
  }
  async function connectCapture() {
    if (!ctx || !captureTap || captureProcessor || capturePending) return;
    capturePending = true;
    try {
      if (!ctx.audioWorklet || !window.AudioWorkletNode)
        throw new Error("Worklet unavailable");
      await ctx.audioWorklet.addModule(
        new URL("../audio/CaptureProcessor.js", import.meta.url),
      );
      if (disposed || !captureTap || ctx.state === "closed") return;
      captureProcessor = new AudioWorkletNode(ctx, "oizodio-capture", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      captureProcessor.port.onmessage = (event) =>
        captured(event.data.data, event.data.sampleRate, event.data.startedAt);
    } catch {
      if (disposed || !captureTap || ctx.state === "closed") return;
      captureProcessor = ctx.createScriptProcessor(2048, 1, 1);
      captureProcessor.onaudioprocess = (event) =>
        captured(
          event.inputBuffer.getChannelData(0),
          ctx.sampleRate,
          event.playbackTime - event.inputBuffer.duration * 2,
        );
    } finally {
      capturePending = false;
    }
    if (!captureProcessor) return;
    captureSink = ctx.createGain();
    captureSink.gain.value = 0;
    master.connect(captureProcessor);
    captureProcessor.connect(captureSink);
    captureSink.connect(ctx.destination);
  }
  function balance() {
    master?.gain.setTargetAtTime(
      0.8 / Math.max(1, voices.size),
      ctx.currentTime,
      0.015,
    );
  }
  function stopVoice(id) {
    const voice = voices.get(id);
    if (!voice) return;
    voices.delete(id);
    voice.source.onended = null;
    voice.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.008);
    voice.source.stop(ctx.currentTime + 0.04);
    setTimeout(() => {
      voice.source.disconnect();
      voice.analyser.disconnect();
      voice.gain.disconnect();
    }, 60);
    balance();
  }
  async function play(id, owner = null, loop = false, dance = Boolean(owner)) {
    if (disposed || !buffers.has(id)) return;
    const exclusive = poems.has(id);
    if (exclusive && (voices.size > 0 || pendingVocal !== null)) return;
    const reservation = exclusive ? { id } : null;
    if (exclusive) {
      pendingVocal = reservation;
      emit();
    }
    try {
      const ticket = playbackRevision;
      const audio = context();
      await audio.resume();
      if (
        disposed ||
        ticket !== playbackRevision ||
        !buffers.has(id) ||
        (owner && gestures.get(owner.key) !== owner)
      )
        return;
      stopVoice(id);
      const source = audio.createBufferSource(),
        gain = audio.createGain();
      source.buffer = buffers.get(id);
      source.loop = loop || Boolean(owner?.looping);
      gain.gain.setValueAtTime(0, audio.currentTime);
      gain.gain.linearRampToValueAtTime(1, audio.currentTime + 0.006);
      const analyser = audio.createAnalyser();
      analyser.fftSize = 2048;
      const graph = {
        ctx: audio,
        analyser,
        bins: new Uint8Array(analyser.frequencyBinCount),
        wave: new Uint8Array(analyser.fftSize),
        prev: new Float32Array(analyser.frequencyBinCount),
      };
      source.connect(analyser);
      analyser.connect(gain);
      gain.connect(master);
      const voice = {
        source,
        gain,
        owner,
        analyser,
        graph,
        dance,
        trigger: ++triggerSerial,
        analysedAt: -1,
      };
      voices.set(id, voice);
      source.onended = () => {
        source.disconnect();
        analyser.disconnect();
        gain.disconnect();
        if (voices.get(id) === voice) {
          voices.delete(id);
          balance();
          emit();
        }
      };
      balance();
      source.start();
      return true;
      emit();
    } finally {
      if (exclusive && pendingVocal === reservation) {
        pendingVocal = null;
        emit();
      }
    }
  }
  function release(key, cancel = false) {
    const brushGesture = brushGestures.get(key);
    if (brushGesture) {
      if (cancel) brushGestures.delete(key);
      else brushGesture.until = performance.now() + 650;
      emit();
      return;
    }
    const gesture = gestures.get(key);
    if (!gesture) return;
    clearTimeout(gesture.timer);
    const voice = voices.get(gesture.id);
    // A short tap completes its one-shot even if resume is still pending.
    gesture.released = true;
    if (cancel || gesture.looping) {
      gestures.delete(key);
      if (voice?.owner === gesture) stopVoice(gesture.id);
    } else {
      if (voice) gestures.delete(key);
    }
    emit();
  }
  function stopAll() {
    brushGestures.clear();
    playbackRevision++;
    pendingVocal = null;
    for (const key of [...gestures.keys()]) release(key, true);
    for (const id of [...voices.keys()]) stopVoice(id);
    emit();
  }
  function stopTracks(session) {
    session.stream?.getTracks().forEach((track) => track.stop());
  }
  function cancelRecording() {
    const session = recording;
    revision++;
    recording = null;
    if (session) {
      clearTimeout(session.timer);
      if (session.recorder?.state === "recording") session.recorder.stop();
      stopTracks(session);
    }
    emit();
  }
  async function prepareSample(decoded, maxSeconds = MAX_TWIG_SECONDS) {
    const frames = Math.min(
      maxSeconds * SAMPLE_RATE,
      Math.floor(decoded.duration * SAMPLE_RATE),
    );
    if (frames < SAMPLE_RATE * 0.04)
      throw new Error(
        "Le son est trop court. Enregistrez une nouvelle brindille.",
      );
    const offline = new OfflineAudioContext(1, frames, SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const sample = await offline.startRendering();
    source.disconnect();
    // Four-millisecond edge envelopes soften one-shots and loop seams.
    const data = sample.getChannelData(0),
      edge = Math.min(96, Math.floor(data.length / 2));
    for (let i = 0; i < edge; i++) {
      const gain = i / edge;
      data[i] *= gain;
      data[data.length - 1 - i] *= gain;
    }
    return sample;
  }
  async function record(id) {
    if (disposed || recording || !ids.includes(id)) return;
    const session = { id, status: "permission", token: ++revision, chunks: [] };
    recording = session;
    stopAll();
    emit();
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error(
          "Le microphone nécessite HTTPS et un navigateur compatible.",
        );
      const audio = context();
      await audio.resume();
      if (disposed || session.token !== revision) return;
      session.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (disposed || session.token !== revision) {
        stopTracks(session);
        return;
      }
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((mime) => MediaRecorder.isTypeSupported(mime));
      const recorder = new MediaRecorder(
        session.stream,
        mimeType ? { mimeType } : {},
      );
      session.recorder = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) session.chunks.push(event.data);
      };
      recorder.onerror = () => {
        if (session.token !== revision || disposed) return;
        cancelRecording();
        onError("L’enregistrement a été interrompu. Réessayez.");
      };
      recorder.onstop = async () => {
        clearTimeout(session.timer);
        stopTracks(session);
        if (disposed || session.token !== revision) return;
        session.status = "decoding";
        emit();
        try {
          const blob = new Blob(session.chunks, { type: recorder.mimeType });
          session.chunks.length = 0;
          const decoded = await audio.decodeAudioData(await blob.arrayBuffer());
          if (disposed || session.token !== revision) return;
          const sample = await prepareSample(decoded);
          if (disposed || session.token !== revision) return;
          stopVoice(id);
          buffers.set(id, sample);
          recording = null;
          emit();
        } catch (error) {
          if (disposed || session.token !== revision) return;
          recording = null;
          emit();
          onError(`Impossible de conserver ce son. ${error.message}`);
        }
      };
      recorder.start(200);
      session.status = "recording";
      session.startedAt = performance.now();
      session.timer = setTimeout(
        () => stopRecording(),
        MAX_TWIG_SECONDS * 1000,
      );
      emit();
    } catch (error) {
      stopTracks(session);
      if (disposed || session.token !== revision) return;
      recording = null;
      emit();
      onError(
        error.name === "NotAllowedError"
          ? "Microphone non autorisé. Vous pouvez réessayer après avoir autorisé l’accès."
          : `Microphone indisponible. ${error.message}`,
      );
    }
  }
  async function importSample(id, file) {
    if (disposed || recording || !ids.includes(id)) return;
    const session = { id, status: "importing", token: ++revision };
    recording = session;
    stopAll();
    emit();
    try {
      if (!file || file.size > 12 * 1024 * 1024)
        throw new Error("Choisissez un fichier audio de 12 Mo maximum.");
      const decoded = await context().decodeAudioData(await file.arrayBuffer());
      if (disposed || session.token !== revision) return;
      const sample = await prepareSample(decoded);
      if (disposed || session.token !== revision) return;
      stopVoice(id);
      buffers.set(id, sample);
      recording = null;
      emit();
    } catch (error) {
      if (disposed || session.token !== revision) return;
      recording = null;
      emit();
      onError(`Import audio impossible. ${error.message}`);
    }
  }
  function stopRecording() {
    const session = recording;
    if (session?.recorder?.state !== "recording") return;
    clearTimeout(session.timer);
    session.status = "decoding";
    session.recorder.stop();
    stopTracks(session);
    emit();
  }
  async function loadPoems(fragments) {
    const ticket = ++poemRequest;
    poemAbort?.abort();
    poemAbort = new AbortController();
    const signal = poemAbort.signal;
    poemLoading = true;
    for (const poem of fragments) poems.set(poem.id, poem);
    emit();
    try {
      const decoder = new OfflineAudioContext(1, 1, SAMPLE_RATE);
      for (const poem of fragments) {
        const response = await fetch(poem.url, { signal });
        if (!response.ok)
          throw new Error(`Lecture indisponible : ${poem.word}`);
        const decoded = await decoder.decodeAudioData(
          await response.arrayBuffer(),
        );
        if (decoded.duration > 15)
          throw new Error(`Fragment trop long : ${poem.label || poem.word}`);
        // Curated voice files are complete phrases, distinct from five-second recordings.
        const sample = await prepareSample(decoded, 15);
        if (disposed || ticket !== poemRequest) return;
        buffers.set(poem.id, sample);
        emit();
      }
    } catch (error) {
      if (!disposed && ticket === poemRequest && error.name !== "AbortError")
        onError(`Voix poétiques : ${error.message}`);
    } finally {
      if (!disposed && ticket === poemRequest) {
        poemLoading = false;
        emit();
      }
    }
  }
  function releaseAmbience(item) {
    if (!item) return;
    item.element.pause();
    item.source?.disconnect();
    item.gain?.disconnect();
    item.element.removeAttribute("src");
    item.element.load();
    URL.revokeObjectURL(item.url);
  }
  async function importAmbience(file) {
    if (disposed) return;
    const ticket = ++ambienceRequest;
    if (pendingAmbience) {
      pendingAmbience.cancel();
      pendingAmbience = null;
    }
    ambienceLoading = true;
    emit();
    const element = new Audio(),
      url = URL.createObjectURL(file),
      candidate = { element, url, name: file.name };
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("Choisissez une ambiance de 20 Mo maximum.");
      element.loop = true;
      element.preload = "metadata";
      await new Promise((resolve, reject) => {
        const cleanup = () => {
          element.onloadedmetadata = null;
          element.onerror = null;
          clearTimeout(timer);
        };
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error("Le fichier ne répond pas."));
        }, 15000);
        pendingAmbience = {
          cancel() {
            cleanup();
            reject(new Error("Import annulé."));
          },
        };
        element.onloadedmetadata = () => {
          cleanup();
          resolve();
        };
        element.onerror = () => {
          cleanup();
          reject(new Error("Format audio invalide."));
        };
        element.src = url;
        element.load();
      });
      if (disposed || ticket !== ambienceRequest) {
        releaseAmbience(candidate);
        return;
      }
      const audio = context();
      candidate.source = audio.createMediaElementSource(element);
      candidate.gain = audio.createGain();
      candidate.gain.gain.value = 0.32;
      candidate.source.connect(candidate.gain);
      candidate.gain.connect(master);
      releaseAmbience(ambience);
      ambience = candidate;
      pendingAmbience = null;
    } catch (error) {
      releaseAmbience(candidate);
      if (!disposed && ticket === ambienceRequest)
        onError(`Ambiance : ${error.message}`);
    } finally {
      if (!disposed && ticket === ambienceRequest) {
        ambienceLoading = false;
        pendingAmbience = null;
        emit();
      }
    }
  }
  function pauseAmbience() {
    ambience?.element.pause();
    emit();
  }
  async function toggleAmbience() {
    if (!ambience || disposed) return;
    if (!ambience.element.paused) {
      pauseAmbience();
      return;
    }
    const ticket = ambienceRequest;
    try {
      await context().resume();
      if (!disposed && ticket === ambienceRequest) {
        await ambience.element.play();
        emit();
      }
    } catch (error) {
      if (!disposed) onError(`Ambiance : ${error.message}`);
    }
  }
  return {
    setCaptureTap(tap) {
      captureTap = tap;
      connectCapture();
    },
    enableFireflies() {
      fireflies = true;
      emit();
    },
    getFragments() {
      return fireflies ? [...poems.values()] : [];
    },
    collide(id) {
      if (!fireflies || ctx?.state !== "running" || voices.size || pendingVocal)
        return Promise.resolve(false);
      return play(id).catch((error) => {
        onError(error.message);
        return false;
      });
    },
    loadPoems,
    getPoem(id) {
      return poems.get(id);
    },
    isSpeaking() {
      return voices.size > 0;
    },
    preparePlayback() {
      if (disposed) return Promise.resolve();
      const audio = context();
      // Unlock the device output inside the trusted touch-release/click gesture.
      if (audio.state !== "running") {
        const silent = audio.createBufferSource();
        silent.buffer = audio.createBuffer(1, 1, audio.sampleRate);
        silent.connect(audio.destination);
        silent.onended = () => silent.disconnect();
        silent.start();
      }
      return audio
        .resume()
        .catch((error) => onError(`Lecture indisponible : ${error.message}`));
    },
    importAmbience,
    toggleAmbience,
    pauseAmbience,
    removeAmbience() {
      ambienceRequest++;
      pendingAmbience?.cancel();
      pendingAmbience = null;
      releaseAmbience(ambience);
      ambience = null;
      ambienceLoading = false;
      emit();
    },
    getSnapshot: snapshot,
    record,
    importSample,
    trigger(id) {
      if (fireflies && ids.includes(id)) {
        brushGestures.set(`tap-${id}`, {
          id,
          trigger: ++triggerSerial,
          until: performance.now() + 1000,
        });
        emit();
        return this.preparePlayback();
      }
      return play(id, null, false, true).catch((error) =>
        onError(error.message),
      );
    },
    getVoices() {
      if (fireflies) {
        const now = performance.now();
        for (const [key, gesture] of brushGestures)
          if (gesture.until < now) {
            brushGestures.delete(key);
            emit();
          }
        const vocal = [...voices.values()][0];
        const features = vocal
          ? readAudioFeatures(vocal.graph)
          : {
              rms: 0.08,
              energy: 0.35,
              low: 0.3,
              high: 0.4,
              flux: 0.1,
              freq: 1200,
            };
        return [...brushGestures.values()].map((gesture) => ({
          id: gesture.id,
          trigger: gesture.trigger,
          features,
        }));
      }
      return [...voices.entries()]
        .filter(([, voice]) => voice.dance)
        .map(([id, voice]) => {
          if (!voice.features || ctx.currentTime - voice.analysedAt >= 0.04) {
            voice.features = readAudioFeatures(voice.graph);
            voice.analysedAt = ctx.currentTime;
          }
          return { id, trigger: voice.trigger, features: voice.features };
        });
    },
    stopRecording,
    cancelRecording,
    stopAll,
    listen(id) {
      return play(id).catch((error) =>
        onError(`Lecture indisponible. ${error.message}`),
      );
    },
    press(id, key) {
      if (fireflies && ids.includes(id)) {
        brushGestures.set(key, {
          id,
          trigger: ++triggerSerial,
          until: Infinity,
        });
        emit();
        void this.preparePlayback();
        return;
      }
      if (disposed || recording || !buffers.has(id)) return;
      if (poems.has(id) && (voices.size > 0 || pendingVocal !== null)) return;
      release(key, true);
      for (const [otherKey, other] of gestures)
        if (other.id === id) release(otherKey, true);
      const gesture = { id, key, looping: false };
      gestures.set(key, gesture);
      if (!poems.has(id))
        gesture.timer = setTimeout(() => {
          if (gestures.get(key) !== gesture) return;
          gesture.looping = true;
          const voice = voices.get(id);
          if (voice?.owner === gesture) {
            voice.source.loop = true;
            emit();
          } else
            void play(id, gesture, true).catch((error) =>
              onError(error.message),
            );
        }, HOLD_DELAY);
      void play(id, gesture)
        .then(() => {
          if (gesture.released && gestures.get(key) === gesture)
            gestures.delete(key);
        })
        .catch((error) => {
          release(key, true);
          onError(`Lecture indisponible. ${error.message}`);
        });
    },
    release,
    remove(id) {
      if (recording?.id === id) cancelRecording();
      for (const [key, gesture] of gestures)
        if (gesture.id === id) release(key, true);
      stopVoice(id);
      buffers.delete(id);
      emit();
    },
    dispose() {
      if (disposed) return;
      cancelRecording();
      stopAll();
      disposed = true;
      poemRequest++;
      poemAbort?.abort();
      poems.clear();
      ambienceRequest++;
      pendingAmbience?.cancel();
      releaseAmbience(ambience);
      ambience = null;
      buffers.clear();
      captureTap = null;
      if (captureProcessor) captureProcessor.onaudioprocess = null;
      if (captureProcessor?.port) {
        captureProcessor.port.onmessage = null;
        captureProcessor.port.close();
      }
      captureProcessor?.disconnect();
      captureSink?.disconnect();
      master?.disconnect();
      if (ctx && ctx.state !== "closed") void ctx.close();
    },
  };
}
