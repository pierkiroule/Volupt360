const strokes = {
  "figure-loop": "m12 2 10 20H2ZM10 17c-4-5 5-7 5-3 0 3-4 4-5 1",
  "figure-spiral": "m12 2 10 20H2ZM8 16c7 4 10-5 5-5-4 0-4 6 0 5",
  "figure-infinity": "m12 2 10 20H2ZM12 16c-8-7-8 6 0 0s8 7 0 0",
  swirl:
    "M4 15c-3-7 7-13 13-8 5 4 1 12-5 11-5-1-5-7-1-8 3-1 5 3 2 4M4 20c4 2 10 2 15-1",
  angular: "m4 18 5-8 3 4 4-9 4 3M5 21l4-1m7-1 3-4",
  rain: "M4 5c4-3 10 3 16-1M7 9l-2 8m8-7-2 11m8-11-2 6",
  mist: "M3 7c5-3 10 3 18-1M5 12c3-2 8 2 14 0M3 17c4-2 9 2 15 0M8 21h7",
  wave: "M3 8c3-6 6 6 9 0s6 6 9 0M3 14c3-6 6 6 9 0s6 6 9 0M5 20c4-3 8 3 13 0",
  mineral:
    "m4 15 2-8 7-3 6 6 1 8-8 3ZM6 7l5 7 8-4m-8 4 1 7M8 17h.1m7-10h.1m2 9h.1",
  breeze: "M3 7c5 4 15-4 17 0s-5 6-9 4M4 14c4 3 10-2 14 1M6 20c4 1 7-1 9-1",
  spark:
    "m12 3 1 5 4 2-4 1-1 5-2-5-4-1 4-2ZM4 17h.1m15-13h.1m0 13 1 3m-3-1 5-1",
  neutral: "M5 7c-5 7 2 16 10 13s8-14 0-16C11 3 7 4 5 7Z",
  pause: "M8 5v14M16 5v14",
  play: "m9 5 10 7-10 7Z",
  sound: "m4 9 4 0 5-5v16l-5-5H4ZM17 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14",
  fold: "m6 9 6 6 6-6",
  expand: "m6 15 6-6 6 6",
  exit: "M10 4H4v16h6m-2-8h13m-5-5 5 5-5 5",
  camera: "M3 7h5l2-3h4l2 3h5v13H3ZM16 13a4 4 0 1 0-8 0 4 4 0 0 0 8 0",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
};
export function ToolIcon({ name }) {
  return (
    <svg
      className="tool-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={strokes[name] || strokes.neutral} />
    </svg>
  );
}
