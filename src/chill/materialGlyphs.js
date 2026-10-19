/** A shared visual alphabet for the palette, paper stamps and floating 3D marks. */
export const MATERIAL_GLYPHS = {
  calligraphie:
    "M4 19C7 15 6 5 12 4C18 3 18 10 13 13C10 15 8 15 5 20M10 18L19 7",
  voiles: "M3 9C8 2 12 16 21 7M3 14C9 7 13 21 21 12M7 19C12 16 15 21 19 18",
  falaises: "M4 18L7 7L13 4L19 10L20 18L12 21ZM7 7L12 14L19 10M12 14L12 21",
  lucioles:
    "M12 3L13 10L20 12L13 14L12 21L10 14L3 12L10 10ZM19 4L19 6M4 19L6 19",
  lagons:
    "M18 7C22 12 18 20 12 20C5 20 2 12 6 7M9 4C12 2 16 3 18 5M8 10C6 14 9 17 12 17",
  filaments: "M3 18C10 18 9 3 21 5M5 20C12 18 13 7 21 7M5 15C10 13 11 7 15 5",
  brumes:
    "M4 7C9 4 13 10 20 6M3 12C9 8 16 16 21 11M5 17C10 14 14 20 19 17M9 21L15 21",
  dilution: "M12 3L12 21M4 7L20 17M4 17L20 7M8 5L12 8L16 5M8 19L12 16L16 19",
  echo: "M4 18C2 12 9 12 10 4C15 8 22 10 20 17C18 23 9 22 8 17C7 14 12 12 14 15",
  hachures:
    "M4 16C1 7 12 1 19 7C25 13 18 23 10 19C3 16 8 8 14 10C19 12 15 17 12 14",
};
export function paintMaterialGlyph(ctx, id, x, y, size, color) {
  const path = MATERIAL_GLYPHS[id];
  if (!path) return;
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.stroke(new Path2D(path));
  ctx.restore();
}
