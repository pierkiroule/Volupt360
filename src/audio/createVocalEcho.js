/** A short, quiet, softened echo; the ambience never enters this bus. */
export function createVocalEcho(ctx, destination) {
  const input = ctx.createGain(),
    delay = ctx.createDelay(1),
    filter = ctx.createBiquadFilter(),
    feedback = ctx.createGain(),
    wet = ctx.createGain();
  delay.delayTime.value = 0.22;
  filter.type = "lowpass";
  filter.frequency.value = 2200;
  feedback.gain.value = 0.12;
  wet.gain.value = 0.16;
  input.connect(destination);
  input.connect(delay);
  delay.connect(filter);
  filter.connect(wet);
  wet.connect(destination);
  filter.connect(feedback);
  feedback.connect(delay);
  return {
    input,
    dispose() {
      for (const node of [input, delay, filter, feedback, wet])
        node.disconnect();
    },
  };
}
