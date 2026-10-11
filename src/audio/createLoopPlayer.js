import { createAudioGraph, readAudioFeatures } from "./audioGraph.js";

/** Native Web Audio looping: sample-accurate boundaries, no polling-based seek,
 * scratch grains, media-element URLs or uploads to an external service.
 */
export function createLoopPlayer() {
  const graph = createAudioGraph();
  graph.analyser.connect(graph.ctx.destination);
  let buffer = null,
    source = null,
    playing = false,
    disposed = false;
  let range = { start: 0, end: 0 },
    position = 0,
    startedAt = 0;
  let playRequest = 0;
  const currentTime = () => {
    if (!playing) return position;
    const span = range.end - range.start;
    return (
      range.start +
      ((position - range.start + graph.ctx.currentTime - startedAt) % span)
    );
  };
  function stop() {
    if (source) {
      source.stop();
      source.disconnect();
      source = null;
    }
  }
  function start() {
    if (!buffer || disposed) return;
    stop();
    source = graph.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = range.start;
    source.loopEnd = range.end;
    source.connect(graph.analyser);
    source.start(0, position);
    startedAt = graph.ctx.currentTime;
    playing = true;
  }
  return {
    async decode(file) {
      return graph.ctx.decodeAudioData(await file.arrayBuffer());
    },
    setBuffer(next) {
      playRequest++;
      stop();
      buffer = next;
      playing = false;
      range = { start: 0, end: next.duration };
      position = 0;
      graph.prev.fill(0);
    },
    selectLoop(loop) {
      if (!buffer) return;
      range = loop || { start: 0, end: buffer.duration };
      position = range.start;
      graph.prev.fill(0);
      if (playing) start();
    },
    async play() {
      const request = ++playRequest;
      await graph.ctx.resume();
      if (request === playRequest && !disposed && buffer && !playing) start();
    },
    pause() {
      playRequest++;
      position = currentTime();
      playing = false;
      stop();
    },
    getState() {
      return {
        playing,
        position: currentTime(),
        duration: buffer?.duration || 0,
        range,
      };
    },
    getFeatures() {
      return playing
        ? readAudioFeatures(graph)
        : { rms: 0, energy: 0, freq: 0, low: 0, high: 0, flux: 0 };
    },
    dispose() {
      disposed = true;
      playRequest++;
      playing = false;
      stop();
      graph.analyser.disconnect();
      if (graph.ctx.state !== "closed") void graph.ctx.close();
    },
  };
}
