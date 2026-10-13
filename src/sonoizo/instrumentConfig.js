export const ENABLE_ECHO_INSTRUMENT =
  import.meta.env.VITE_ENABLE_ECHO_INSTRUMENT !== "false" &&
  new URLSearchParams(location.search).get("instrument") !== "off";
export const ENABLE_POETIC_VOICES =
  import.meta.env.VITE_ENABLE_POETIC_VOICES === "true";
