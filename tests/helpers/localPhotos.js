import { naturePng } from "./birdFixtures.js";
export const photoFile = (seed = 1) => ({
  name: `nature-${seed}.png`,
  mimeType: "image/png",
  buffer: naturePng(seed),
});
export const importPhoto = (page, seed = 1) =>
  page.locator("input[data-photo-import]").setInputFiles(photoFile(seed));
