import { test, expect } from "@playwright/test";
async function birth(page, words = ["Flottement", "Douceur"]) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Composer mon ciel", exact: true })
    .click();
  for (const word of words)
    await page.getByRole("button", { name: word, exact: true }).click();
  await page.getByRole("button", { name: "Faire naître mon ciel" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect
    .poll(() => page.locator("canvas").getAttribute("data-sky-time"))
    .not.toBeNull();
}
test("shared sky renders, transforms without reset, pauses and exports PNG and JSON", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await birth(page);
  const canvas = page.locator("canvas"),
    seed = await canvas.getAttribute("data-sky-seed");
  await page.waitForTimeout(600);
  await page
    .getByRole("button", { name: "Faire évoluer mon ciel", exact: true })
    .click();
  await page
    .getByRole("slider", { name: "Intensité Flottement", exact: true })
    .fill("95");
  await expect(canvas).toHaveAttribute("data-sky-seed", seed);
  await page
    .getByRole("button", { name: "Revenir à mon ciel initial" })
    .click();
  await expect(
    page.getByRole("slider", { name: "Intensité Flottement", exact: true }),
  ).toHaveValue("60");
  await page.getByRole("checkbox", { name: "Mouvements réduits" }).check();
  await page.getByRole("button", { name: "Fermer les réglages" }).click();
  await page
    .getByRole("button", { name: "Mettre en pause", exact: true })
    .click();
  await page.waitForTimeout(150);
  const paused = await canvas.getAttribute("data-sky-time");
  await page.waitForTimeout(250);
  await expect(canvas).toHaveAttribute("data-sky-time", paused);
  await page.getByRole("button", { name: "Contempler sans interface" }).click();
  await expect(
    page.getByRole("navigation", { name: "Commandes du ciel" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Reprendre l’expérience" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Afficher les commandes" }).click();
  let download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Image PNG", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("mon-ciel-sensoriel.png");
  download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("mon-ciel-sensoriel.json");
  await page.getByRole("button", { name: "Partager", exact: true }).click();
  const url = await page
    .getByRole("textbox", { name: "Lien de composition" })
    .inputValue();
  expect(url).toContain("#c=");
  await page.goto(url);
  await expect(page.locator("canvas")).toHaveAttribute("data-sky-seed", seed);
  await expect(
    page.getByRole("button", { name: "Activer le son" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("search, five-word limit, custom word and JSON validation", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Composer mon ciel", exact: true })
    .click();
  await page.getByRole("searchbox").fill("leger");
  await expect(
    page.getByRole("button", { name: "Légèreté", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Légèreté", exact: true }).click();
  await page.getByRole("searchbox").fill("");
  await page
    .getByLabel("Ou inventer ton mot", { exact: true })
    .fill("Entre deux eaux");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(
    page.getByText("Donner une matière à mon mot", { exact: true }),
  ).toBeVisible();
  for (const w of ["Silence", "Calme", "Tension"])
    await page.getByRole("button", { name: w, exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Agitation", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Faire naître mon ciel" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole("alert")).toContainText("invalide");
});
test("WebGL unavailable uses functional simplified sky and PNG export", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      if (String(kind).startsWith("webgl")) return null;
      return original.call(this, kind, ...args);
    };
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Composer mon ciel", exact: true })
    .click();
  await page.getByRole("button", { name: "Flottement", exact: true }).click();
  await page.getByRole("button", { name: "Faire naître mon ciel" }).click();
  await expect(
    page.getByRole("img", { name: /Ciel sensoriel simplifié/ }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Image PNG", exact: true }).click();
  expect((await download).suggestedFilename()).toContain(".png");
});
test("sound is opt-in, graph resumes and pause suspends audio", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Real = window.AudioContext;
    window.__audio = [];
    window.AudioContext = class extends Real {
      constructor(...args) {
        super(...args);
        window.__audio.push(this);
      }
    };
  });
  await birth(page, ["Profondeur", "Fluidité"]);
  expect(await page.evaluate(() => window.__audio.length)).toBe(0);
  await page.getByRole("button", { name: "Activer le son" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__audio[0]?.state))
    .toBe("running");
  await page.getByRole("button", { name: "Mettre en pause" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__audio[0]?.state))
    .toBe("suspended");
  await page.getByRole("button", { name: "Reprendre l’expérience" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__audio[0]?.state))
    .toBe("running");
  await page.getByRole("button", { name: "Son activé" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__audio[0]?.state))
    .toBe("suspended");
});
test("touch-sized layout, stable camera gestures and keyboard contemplation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await birth(page);
  const canvas = page.locator("canvas"),
    rect = await canvas.boundingBox();
  await page.mouse.move(rect.x + 180, rect.y + 350);
  await page.mouse.down();
  await page.mouse.move(rect.x + 280, rect.y + 430, { steps: 10 });
  await page.mouse.up();
  await canvas.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("+");
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Reprendre l’expérience" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("two compositions with the same seed produce visibly different skies; editing retains the running world", async ({
  page,
}) => {
  await birth(page, ["Flottement", "Douceur"]);
  await page.waitForTimeout(1200);
  const canvas = page.locator("canvas"),
    first = await canvas.screenshot({ animations: "disabled" }),
    seed = await canvas.getAttribute("data-sky-seed");
  await page
    .getByRole("button", { name: "Faire évoluer mon ciel", exact: true })
    .click();
  for (const label of ["Flottement", "Douceur"])
    await page
      .getByRole("button", { name: `Retirer ${label}`, exact: true })
      .click();
  for (const label of ["Lourdeur", "Tension"])
    await page.getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("button", { name: "Fermer les réglages" }).click();
  await page.waitForTimeout(1500);
  const second = await canvas.screenshot({ animations: "disabled" });
  expect(first.equals(second)).toBe(false);
  await expect(canvas).toHaveAttribute("data-sky-seed", seed);
  await page
    .getByRole("button", { name: "Mettre en pause", exact: true })
    .click();
  await page.waitForTimeout(100);
  const before = await canvas.screenshot({ animations: "disabled" });
  await page.waitForTimeout(200);
  expect(
    (await canvas.screenshot({ animations: "disabled" })).equals(before),
  ).toBe(true);
});

test("valid JSON restores seeded choices and WebGL context loss falls back without losing them", async ({
  page,
}) => {
  await birth(page);
  const composition = {
    version: 1,
    seed: 7331,
    words: [
      {
        id: "custom-demo",
        label: "Une marge",
        vector: [-0.8, 0.6, 0.8, -0.5, 0.2, 0.3, 0.8, 0.2],
        intensity: 82,
        custom: true,
      },
    ],
  };
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "sky.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(composition)),
    });
  await expect(page.locator("canvas")).toHaveAttribute("data-sky-seed", "7331");
  await page
    .getByRole("button", { name: "Faire évoluer mon ciel", exact: true })
    .click();
  await expect(
    page.getByRole("slider", { name: "Intensité Une marge", exact: true }),
  ).toHaveValue("82");
  await page.getByRole("button", { name: "Fermer les réglages" }).click();
  await page
    .locator("canvas")
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(
    page.getByRole("img", { name: /Ciel sensoriel simplifié/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Faire évoluer mon ciel", exact: true })
    .click();
  await expect(
    page.getByRole("slider", { name: "Intensité Une marge", exact: true }),
  ).toHaveValue("82");
});
