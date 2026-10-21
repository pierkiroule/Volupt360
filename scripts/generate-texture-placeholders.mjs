import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const definitions = [
  ["🔥", "feu", "Feu", "anger", "#ff956b", "braises, flammes floues, cendres"],
  ["🌊", "vague", "Vague", "peace", "#66cbd0", "eau, vagues, reflets"],
  [
    "☁️",
    "nuage",
    "Nuage",
    "uncertainty",
    "#b6ccdc",
    "brume, voiles, transparences",
  ],
  [
    "✨",
    "etincelle",
    "Étincelle",
    "wonder",
    "#f0dcb1",
    "éclats doux, poussière dorée, bokeh",
  ],
  [
    "🌧️",
    "pluie",
    "Pluie",
    "sadness",
    "#80b8f0",
    "gouttes, ruissellements, vitre humide",
  ],
  [
    "🌀",
    "spirale",
    "Spirale",
    "worry",
    "#b9a0e5",
    "courants, tourbillons, spirales naturelles",
  ],
  [
    "🌸",
    "fleur",
    "Fleur",
    "frustration",
    "#e895bd",
    "pétales, nervures, floraisons abstraites",
  ],
  [
    "☀️",
    "soleil",
    "Soleil",
    "joy",
    "#f3cc7e",
    "lumière chaude, horizons, sable",
  ],
  [
    "🌙",
    "lune",
    "Lune",
    "sadness",
    "#a6b4ef",
    "pierres pâles, ciel nocturne, reflets froids",
  ],
  [
    "🍃",
    "souffle",
    "Souffle",
    "peace",
    "#a1d4b4",
    "fibres, feuillage flou, traces légères",
  ],
  [
    "❄️",
    "cristal",
    "Cristal",
    "uncertainty",
    "#c1e5f1",
    "givre, cristallisations, facettes",
  ],
  [
    "🫧",
    "bulle",
    "Bulle",
    "wonder",
    "#d0b6eb",
    "irisations, reflets, membranes",
  ],
];
const target = resolve("public/textures");
if (!process.argv.includes("--force")) {
  try {
    await readFile(resolve(target, "catalog.json"));
    console.log(
      "La bibliothèque existe déjà. --force régénère et écrase les placeholders et le catalogue.",
    );
    process.exit(0);
  } catch {}
}
const originals = await Promise.all(
  ["Text1.png", "rezo.png"].map(
    async (name) =>
      "data:image/png;base64," +
      (await readFile(resolve(target, name))).toString("base64"),
  ),
);
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const catalog = {
    version: 1,
    description:
      "Placeholders dérivés des deux images locales ; remplacer les fichiers par des photos thématiques choisies.",
    entries: [],
  };
  for (const [index, definition] of definitions.entries()) {
    const [emoji, id, label, brush, color, suggestions] = definition;
    const folder = resolve(target, "emojis", id);
    await mkdir(folder, { recursive: true });
    const layers = [];
    for (let slot = 0; slot < 3; slot++) {
      const name = ["01-base.jpg", "02-matiere.jpg", "03-accent.jpg"][slot];
      const data = await page.evaluate(
        async ({ originals, index, slot, color }) => {
          const image = new Image();
          image.src = originals[(index + slot) % originals.length];
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 384;
          const c = canvas.getContext("2d");
          c.fillStyle = color;
          c.fillRect(0, 0, 384, 384);
          const crop = Math.min(image.width, image.height) * (0.7 + slot * 0.1),
            x = (image.width - crop) * ((index % 4) / 3),
            y = (image.height - crop) * ((index % 3) / 2);
          c.drawImage(image, x, y, crop, crop, 0, 0, 384, 384);
          c.globalCompositeOperation = slot === 1 ? "soft-light" : "color";
          c.globalAlpha = 0.2 + slot * 0.06;
          c.fillStyle = color;
          c.fillRect(0, 0, 384, 384);
          return canvas.toDataURL("image/jpeg", 0.83).split(",")[1];
        },
        { originals, index, slot, color },
      );
      await writeFile(resolve(folder, name), Buffer.from(data, "base64"));
      layers.push({
        role: ["base", "matiere", "accent"][slot],
        path: `emojis/${id}/${name}`,
        fallback: slot % 2 ? "rezo.png" : "Text1.png",
        blend: ["source-over", "soft-light", "screen"][slot],
        opacity: [1, 0.42, 0.3][slot],
      });
    }
    await writeFile(
      resolve(folder, "README.md"),
      `# ${emoji} ${label}\n\nPlaceholders issus de Text1.png et rezo.png, pas des photos thématiques originales.\n\nRemplacer directement :\n- 01-base.jpg : image principale lisible.\n- 02-matiere.jpg : détail, matière ou motif.\n- 03-accent.jpg : lumière, fragment ou contrepoint.\n\nPistes visuelles : ${suggestions}.\nGarder ces noms ; préférer des images carrées de 512 à 1024 px.\nLes trois couches se mélangent avec les autres emojis choisis.\n`,
    );
    catalog.entries.push({
      emoji,
      id,
      label,
      brush,
      color,
      suggestions,
      layers,
    });
  }
  await writeFile(
    resolve(target, "catalog.json"),
    JSON.stringify(catalog, null, 2) + "\n",
  );
} finally {
  await browser.close();
}
