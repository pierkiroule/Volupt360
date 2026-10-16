/** Gentle full-mix voicing, including percussion and reverb returns. */
export const SOFT_TONE = Object.freeze({
  highpass: 32,
  presence: 2000,
  presenceGain: -5,
  lowpass: 2200,
});
export function createSoftTone(ctx, destination) {
  const highpass = ctx.createBiquadFilter(),
    presence = ctx.createBiquadFilter(),
    lowpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = SOFT_TONE.highpass;
  highpass.Q.value = 0.5;
  presence.type = "peaking";
  presence.frequency.value = SOFT_TONE.presence;
  presence.Q.value = 0.65;
  presence.gain.value = SOFT_TONE.presenceGain;
  lowpass.type = "lowpass";
  lowpass.frequency.value = SOFT_TONE.lowpass;
  lowpass.Q.value = 0.55;
  highpass.connect(presence);
  presence.connect(lowpass);
  lowpass.connect(destination);
  return {
    input: highpass,
    filters: [highpass, presence, lowpass],
    dispose() {
      highpass.disconnect();
      presence.disconnect();
      lowpass.disconnect();
    },
  };
}
