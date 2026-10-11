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
  const buffers = new Map(),
    voices = new Map(),
    gestures = new Map();
  let ctx,
    master,
    captureProcessor,
    captureSink,
    captureTap,
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
      slots: Object.fromEntries(
        ids.map((id) => [
          id,
          {
            duration: buffers.get(id)?.duration || 0,
            playing: voices.has(id),
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
  function connectCapture() {
    if (!ctx || !captureTap || captureProcessor) return;
    captureProcessor = ctx.createScriptProcessor(2048, 1, 1);
    captureSink = ctx.createGain();
    captureSink.gain.value = 0;
    master.connect(captureProcessor);
    captureProcessor.connect(captureSink);
    captureSink.connect(ctx.destination);
    captureProcessor.onaudioprocess = (event) =>
      captureTap?.(event.inputBuffer.getChannelData(0), ctx.sampleRate);
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
    emit();
  }
  function release(key, cancel = false) {
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
    playbackRevision++;
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
  async function prepareSample(decoded) {
    const frames = Math.min(
      MAX_TWIG_SECONDS * SAMPLE_RATE,
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
  return {
    setCaptureTap(tap) {
      captureTap = tap;
      connectCapture();
    },
    getSnapshot: snapshot,
    record,
    importSample,
    trigger(id) {
      return play(id, null, false, true).catch((error) =>
        onError(error.message),
      );
    },
    getVoices() {
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
      if (disposed || recording || !buffers.has(id)) return;
      release(key, true);
      for (const [otherKey, other] of gestures)
        if (other.id === id) release(otherKey, true);
      const gesture = { id, key, looping: false };
      gestures.set(key, gesture);
      gesture.timer = setTimeout(() => {
        if (gestures.get(key) !== gesture) return;
        gesture.looping = true;
        const voice = voices.get(id);
        if (voice?.owner === gesture) {
          voice.source.loop = true;
          emit();
        } else
          void play(id, gesture, true).catch((error) => onError(error.message));
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
      buffers.clear();
      captureTap = null;
      if (captureProcessor) captureProcessor.onaudioprocess = null;
      captureProcessor?.disconnect();
      captureSink?.disconnect();
      master?.disconnect();
      if (ctx && ctx.state !== "closed") void ctx.close();
    },
  };
}
