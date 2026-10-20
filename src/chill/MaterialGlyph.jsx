import { MATERIAL_GLYPHS } from "./materialGlyphs.js";
export function MaterialGlyph({ id }) {
  return (
    <svg
      className="material-glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={MATERIAL_GLYPHS[id]} />
    </svg>
  );
}
