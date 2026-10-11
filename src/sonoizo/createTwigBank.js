export const MAX_TWIG_SECONDS = 10;
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

/** Session-local, mono sample bank. No monitoring, uploads or painting hooks. */
export function createTwigBank({
  ids,
  onChange = () => {},
  onError = () => {},
}) {
  if (ids.length > 12 || new Set(ids).size !== ids.length)
    throw new Error("Invalid twig slots");
  const buffers = new Map(),
    voices = new Map(),
    gestures = new Map();
  let ctx,
    master,
    recording = null,
    revision = 0,
    playbackRevision = 0,
    disposed = false;
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
    }
    return ctx;
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
      voice.gain.disconnect();
    }, 60);
    balance();
  }
  async function play(id, owner = null, loop = false) {
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
    source.connect(gain);
    gain.connect(master);
    const voice = { source, gain, owner };
    voices.set(id, voice);
    source.onended = () => {
      source.disconnect();
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
          if (disposed || session.token !== revision) return;
          // Four-millisecond edge envelopes soften one-shots and loop seams.
          const data = sample.getChannelData(0),
            edge = Math.min(96, Math.floor(data.length / 2));
          for (let i = 0; i < edge; i++) {
            const gain = i / edge;
            data[i] *= gain;
            data[data.length - 1 - i] *= gain;
          }
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
    getSnapshot: snapshot,
    record,
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
      master?.disconnect();
      if (ctx && ctx.state !== "closed") void ctx.close();
    },
  };
}
