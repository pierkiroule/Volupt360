import processorURL from "./WaterProcessor.js?worker&url";

const modules = new WeakMap();
export async function prepareWaterAudio(ctx) {
  if (!ctx.audioWorklet)
    throw new Error("La synthèse aquatique nécessite Web Audio sur HTTPS.");
  if (!modules.has(ctx)) {
    const loading = ctx.audioWorklet.addModule(processorURL).catch((error) => {
      modules.delete(ctx);
      throw error;
    });
    modules.set(ctx, loading);
  }
  await modules.get(ctx);
}

export function createWaterSource(ctx, options) {
  const node = new AudioWorkletNode(ctx, "echo-water", {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [1],
    processorOptions: options,
  });
  let ended = false;
  const source = {
    node,
    onended: null,
    stop(time) {
      if (!ended) node.port.postMessage({ stopAt: time });
    },
    disconnect() {
      ended = true;
      node.port.postMessage({ dispose: true });
      node.port.onmessage = null;
      node.port.close();
      node.disconnect();
    },
  };
  node.port.onmessage = ({ data }) => {
    if (data.ended && !ended) source.onended?.();
  };
  return source;
}
