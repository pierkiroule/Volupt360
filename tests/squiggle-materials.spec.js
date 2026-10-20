import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
const source = "https://commons.wikimedia.org/wiki/File:Nature_texture.jpg";
const photo = "https://upload.wikimedia.org/test-texture.png";
async function draw(page) {
  await page.mouse.move(350, 330);
  await page.mouse.down();
  for (let i = 0; i < 30; i++)
    await page.mouse.move(350 + i * 10, 330 + Math.sin(i * 0.15) * 60);
  await page.mouse.up();
}
test("Commons textures blend safely in both dimensions and PNG keeps UTF-8 attribution", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    for (let i = 0; i < 64; i++) {
      ctx.fillStyle = `rgb(${i * 4},${i * 4},${i * 4})`;
      ctx.fillRect(i, 0, 1, 64);
    }
    return c.toDataURL().split(",")[1];
  });
  let apiRequests = 0,
    imageRequests = 0;
  await page.route("https://commons.wikimedia.org/w/api.php?**", (route) => {
    apiRequests++;
    return route.fulfill({
      json: {
        query: {
          pages: {
            1: {
              title: "File:Nature_texture.jpg",
              imageinfo: [
                {
                  thumburl: photo,
                  descriptionurl: source,
                  extmetadata: {
                    Artist: {
                      value: '<a href="https://example.com">Élodie</a>',
                    },
                    LicenseShortName: { value: "CC BY 4.0" },
                    LicenseUrl: {
                      value: "https://creativecommons.org/licenses/by/4.0/",
                    },
                  },
                },
              ],
            },
          },
        },
      },
    });
  });
  await page.route(photo, (route) => {
    imageRequests++;
    return route.fulfill({
      contentType: "image/png",
      body: Buffer.from(png, "base64"),
    });
  });
  await page.goto("/");
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-photo-matter",
    "true",
  );
  await draw(page);
  await expect(page.locator(".squiggle-credits")).toHaveCount(0);
  await page.getByRole("button", { name: "Sources des matières" }).click();
  await expect(
    page.getByRole("link", { name: "Nature_texture.jpg" }),
  ).toHaveAttribute("href", source);
  await expect(page.getByLabel("Crédits photographiques")).toContainText(
    "Élodie",
  );
  await page.getByRole("button", { name: "Fermer les crédits" }).click();
  await page
    .getByRole("button", { name: "Entrer en 360", exact: true })
    .click();
  const canvas = page.locator(".squiggle-world canvas");
  await expect(canvas).toHaveAttribute("data-photo-matter", "true");
  await expect(canvas).toHaveAttribute(
    "data-material-style",
    "abstract-watercolor",
  );
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-particles")))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Autres outils" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG ↓", exact: true }).click();
  const data = await fs.readFile(await (await download).path());
  expect(data.toString("utf8")).toContain("Élodie");
  expect(data.toString("utf8")).toContain(source);
  expect(data.subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  let pos = 8,
    hasAttribution = false;
  while (pos < data.length) {
    const length = data.readUInt32BE(pos),
      type = data.toString("ascii", pos + 4, pos + 8);
    if (type === "iTXt") {
      hasAttribution = true;
      let crc = 0xffffffff;
      for (let i = pos + 4; i < pos + 8 + length; i++) {
        crc ^= data[i];
        for (let bit = 0; bit < 8; bit++)
          crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
      expect(data.readUInt32BE(pos + 8 + length)).toBe(
        (crc ^ 0xffffffff) >>> 0,
      );
    }
    pos += length + 12;
  }
  expect(hasAttribution).toBe(true);
  expect(apiRequests).toBe(1);
  expect(imageRequests).toBe(1);
  expect(errors).toEqual([]);
});
test("network refusal keeps procedural painting, bounded GPU layers and valid licence filtering", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://commons.wikimedia.org/w/api.php?**", (route) =>
    route.abort(),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Entrer en 360", exact: true }),
  ).toBeEnabled();
  await draw(page);
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-strokes",
    "1",
  );
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-photo-matter",
    "false",
  );
  const result = await page.evaluate(async () => {
    const { createWatercolorField } =
      await import("/src/squiggle/createWatercolorField.js");
    const { allowedPhoto } = await import("/src/squiggle/photoMatter.js");
    const strokes = Array.from({ length: 120 }, (_, i) => ({
      id: i,
      emotionId: "peace",
      color: "#358ca1",
      size: 100,
      opacity: 0.9,
      points: Array.from({ length: 50 }, (_, j) => ({
        x: j / 50,
        y: 0.2 + i / 200,
      })),
    }));
    const field = createWatercolorField({ mobile: true });
    field.setDocument(strokes);
    field.update(2);
    const stats = field.stats;
    const finite = field.group.children.every((object) =>
      Object.values(object.geometry.attributes).every((a) =>
        Array.from(a.array).every(Number.isFinite),
      ),
    );
    field.dispose();
    const bad = allowedPhoto({
      imageinfo: [
        {
          thumburl: "javascript:alert(1)",
          descriptionurl: "https://commons.wikimedia.org/wiki/File:X",
          extmetadata: {
            LicenseShortName: { value: "CC BY 4.0" },
            LicenseUrl: {
              value: "https://creativecommons.org/licenses/by/4.0/",
            },
          },
        },
      ],
    });
    return { stats, finite, children: field.group.children.length, bad };
  });
  expect(result.finite).toBe(true);
  expect(result.children).toBe(0);
  expect(result.bad).toBeNull();
  expect(result.stats.particles).toBeLessThanOrEqual(2800);
  expect(result.stats.veils).toBeLessThanOrEqual(160);
  expect(result.stats.ribbonVertices).toBeLessThanOrEqual(700 * 6);
  await page
    .getByRole("button", { name: "Entrer en 360", exact: true })
    .click();
  await expect(page.locator(".squiggle-world canvas")).toHaveAttribute(
    "data-material-style",
    "abstract-watercolor",
  );
  expect(errors).toEqual([]);
});

test("a thumbnail CORS failure leaves the canvas drawable and exportable", async ({
  page,
}) => {
  await page.route("https://commons.wikimedia.org/w/api.php?**", (route) =>
    route.fulfill({
      json: {
        query: {
          pages: {
            1: {
              title: "File:Nature_texture.jpg",
              imageinfo: [
                {
                  thumburl: photo,
                  descriptionurl: source,
                  extmetadata: {
                    Artist: { value: "Photographe" },
                    LicenseShortName: { value: "CC BY 4.0" },
                    LicenseUrl: {
                      value: "https://creativecommons.org/licenses/by/4.0/",
                    },
                  },
                },
              ],
            },
          },
        },
      },
    }),
  );
  await page.route(photo, (route) => route.abort("accessdenied"));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Entrer en 360", exact: true }),
  ).toBeEnabled();
  await draw(page);
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-photo-matter",
    "false",
  );
  await page.getByRole("button", { name: "Autres outils" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG ↓", exact: true }).click();
  const bytes = await fs.readFile(await (await download).path());
  expect(bytes.length).toBeGreaterThan(500);
});
