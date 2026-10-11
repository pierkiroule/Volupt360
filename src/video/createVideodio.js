const HISTORY = 6000;

/** A bounded JPEG + mono PCM ring; export uses native browser encoders. */
export function createVideodio() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  let frames = [],
    audio = [],
    lastFrame = 0,
    pending = false,
    frozen = false,
    disposed = false,
    generation = 0,
    exporting = false;
  function trim(items, now) {
    while (items.length && items[0].time < now - HISTORY) items.shift();
  }
  return {
    frame(source, now = performance.now()) {
      if (disposed || frozen || pending || now - lastFrame < 1000 / 12) return;
      lastFrame = now;
      const scale = Math.min(1, 640 / Math.max(source.width, source.height));
      const w = Math.max(2, Math.round((source.width * scale) / 2) * 2);
      const h = Math.max(2, Math.round((source.height * scale) / 2) * 2);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      context.drawImage(source, 0, 0, w, h);
      pending = true;
      const ticket = generation;
      canvas.toBlob(
        (blob) => {
          pending = false;
          if (!blob || disposed || frozen || ticket !== generation) return;
          frames.push({ time: now, blob });
          trim(frames, now);
        },
        "image/jpeg",
        0.82,
      );
    },
    audio(data, sampleRate) {
      if (disposed || frozen) return;
      const time = performance.now();
      audio.push({ time, sampleRate, data: new Float32Array(data) });
      trim(audio, time);
    },
    freeze(value) {
      frozen = value;
      generation++;
      if (!value) {
        frames = [];
        audio = [];
      }
    },
    getHistory() {
      return { frames: frames.length, audio: audio.length };
    },
    async export(source, onProgress = () => {}) {
      if (exporting || disposed) throw new Error("Export déjà en cours.");
      if (!window.MediaRecorder || !canvas.captureStream)
        throw new Error(
          "Ce navigateur ne permet pas l’export vidéo. Essayez Chrome ou Safari récent.",
        );
      const mime = [
        "video/webm;codecs=vp8,opus",
        "video/mp4",
        "video/webm",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error("Aucun encodeur vidéo compatible.");
      exporting = true;
      const history = frames.slice(),
        sound = audio.slice();
      const end = history.at(-1)?.time ?? performance.now(),
        start = end - HISTORY;
      const output = document.createElement("canvas");
      const scale = Math.min(1, 640 / Math.max(source.width, source.height));
      output.width = Math.max(2, Math.round((source.width * scale) / 2) * 2);
      output.height = Math.max(2, Math.round((source.height * scale) / 2) * 2);
      const paint = output.getContext("2d");
      const still = document.createElement("canvas");
      still.width = output.width;
      still.height = output.height;
      still.getContext("2d").drawImage(source, 0, 0, still.width, still.height);
      paint.drawImage(still, 0, 0);
      const stream = output.captureStream(24);
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      let recorder, timer, bitmap;
      try {
        await ctx.resume();
        const destination = ctx.createMediaStreamDestination();
        const rate = sound[0]?.sampleRate || 24000;
        const buffer = ctx.createBuffer(1, rate * 6, rate);
        const pcm = buffer.getChannelData(0);
        for (const chunk of sound) {
          const chunkStart =
            chunk.time - (chunk.data.length / chunk.sampleRate) * 1000;
          const offset = Math.round(((chunkStart - start) / 1000) * rate);
          for (let i = 0; i < chunk.data.length; i++) {
            const at = offset + i;
            if (at >= 0 && at < pcm.length) pcm[at] = chunk.data[i];
          }
        }
        const voice = ctx.createBufferSource();
        voice.buffer = buffer;
        voice.connect(destination);
        for (const track of destination.stream.getAudioTracks())
          stream.addTrack(track);
        const chunks = [];
        recorder = new MediaRecorder(stream, {
          mimeType: mime,
          videoBitsPerSecond: 1800000,
        });
        const finished = new Promise((resolve, reject) => {
          recorder.ondataavailable = (event) => {
            if (event.data.size) chunks.push(event.data);
          };
          recorder.onstop = () =>
            resolve(new Blob(chunks, { type: recorder.mimeType }));
          recorder.onerror = () =>
            reject(new Error("L’encodeur vidéo a été interrompu."));
        });
        recorder.start(250);
        const began = performance.now();
        voice.start(ctx.currentTime + 4);
        let previous = -1;
        while (performance.now() - began < 10000) {
          if (disposed || document.hidden)
            throw new Error(
              "Export interrompu : gardez l’application visible.",
            );
          const elapsed = performance.now() - began;
          if (elapsed < 4000) paint.drawImage(still, 0, 0);
          if (elapsed >= 4000 && history.length) {
            const target = start + elapsed - 4000;
            let index = history.findLastIndex((frame) => frame.time <= target);
            if (index < 0) index = 0;
            if (index !== previous) {
              bitmap?.close();
              bitmap = await createImageBitmap(history[index].blob);
              paint.drawImage(bitmap, 0, 0, output.width, output.height);
              previous = index;
            }
          }
          onProgress(Math.min(1, elapsed / 10000));
          await new Promise((resolve) => {
            timer = setTimeout(resolve, 1000 / 24);
          });
        }
        recorder.stop();
        const blob = await finished;
        onProgress(1);
        return { blob, extension: mime.includes("mp4") ? "mp4" : "webm" };
      } finally {
        clearTimeout(timer);
        bitmap?.close();
        if (recorder?.state === "recording") recorder.stop();
        stream.getTracks().forEach((track) => track.stop());
        await ctx.close();
        exporting = false;
      }
    },
    dispose() {
      disposed = true;
      generation++;
      frames = [];
      audio = [];
    },
  };
}
