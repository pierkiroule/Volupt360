import { test, expect } from "@playwright/test";
async function birth(page, words = ["Joie", "Confiance"]) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Composer mon univers", exact: true })
    .click();
  for (const word of words)
    await page.getByRole("button", { name: word, exact: true }).click();
  await page.getByRole("button", { name: "↗ Voyager", exact: true }).click();
  await page.getByRole("button", { name: "Entrer dans mon univers" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect
    .poll(() => page.locator("canvas").getAttribute("data-sky-time"))
    .not.toBeNull();
}
test("immersive sculpture renders, pauses, exports and preserves composition links", async ({
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
  await expect(
    page.getByRole("button", { name: "Faire évoluer mon ciel" }),
  ).toHaveCount(0);
  await expect(canvas).toHaveAttribute("data-world-clouds", /28|44/);
  await page
    .getByRole("button", { name: "Mettre en pause", exact: true })
    .click();
  await page.waitForTimeout(150);
  const paused = await canvas.getAttribute("data-sky-time"),
    position = await canvas.getAttribute("data-camera-position");
  await page.waitForTimeout(250);
  await expect(canvas).toHaveAttribute("data-sky-time", paused);
  await expect(canvas).toHaveAttribute("data-camera-position", position);
  await page.getByRole("button", { name: "Masquer l’interface" }).click();
  await expect(
    page.getByRole("navigation", { name: "Commandes de l’univers" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Reprendre l’expérience" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Afficher les commandes" }).click();
  let download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Image PNG", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("cosmomood-360.png");
  download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("cosmomood-360.json");
  await page.getByRole("button", { name: "Partager", exact: true }).click();
  const url = await page
    .getByRole("textbox", { name: "Lien de composition" })
    .inputValue();
  expect(url).toContain("#c=");
  await page.goto(url);
  await expect(page.locator("canvas")).toHaveAttribute("data-sky-seed", seed);
  expect(errors).toEqual([]);
});
test("emotional disc permits three coexisting choices and keeps intensity control", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Composer mon univers", exact: true })
    .click();
  await expect(page.locator(".cosmo-emoji-orbit")).toHaveCount(8);
  for (const w of ["Joie", "Tristesse", "Colère"])
    await page.getByRole("button", { name: w, exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Surprise", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("slider", { name: "Présence Colère", exact: true })
    .fill("90");
  await page.getByRole("button", { name: "Entrer dans mon univers" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole("alert")).toContainText("invalide");
});
test("actual drone translation, gestures, pause travel and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await birth(page);
  const canvas = page.locator("canvas");
  const initial = await canvas.getAttribute("data-camera-position");
  await expect
    .poll(() => canvas.getAttribute("data-camera-position"))
    .not.toBe(initial);
  const rect = await canvas.boundingBox();
  await page.mouse.move(rect.x + 160, rect.y + 350);
  await page.mouse.down();
  await page.mouse.move(rect.x + 280, rect.y + 420, { steps: 10 });
  await page.mouse.up();
  await page.getByRole("button", { name: "◉ Contempler", exact: true }).click();
  await page.waitForTimeout(100);
  const still = await canvas.getAttribute("data-camera-position");
  await page.waitForTimeout(250);
  await expect(canvas).toHaveAttribute("data-camera-position", still);
  await canvas.focus();
  const fov = await canvas.getAttribute("data-camera-fov");
  await page.keyboard.press("+");
  await expect.poll(() => canvas.getAttribute("data-camera-fov")).not.toBe(fov);
  await page.getByRole("button", { name: "Ouvrir les options" }).click();
  await page.getByRole("checkbox", { name: "Mouvements réduits" }).check();
  await page.getByRole("button", { name: "Fermer les réglages" }).click();
  await page.getByRole("button", { name: "↗ Voyager", exact: true }).click();
  await page.waitForTimeout(100);
  const reduced = await canvas.getAttribute("data-camera-position");
  await page.waitForTimeout(200);
  await expect(canvas).toHaveAttribute("data-camera-position", reduced);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
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
  await birth(page, ["Joie", "Confiance"]);
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
test("WebGL unavailable retains simplified sky and PNG export", async ({
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
    .getByRole("button", { name: "Composer mon univers", exact: true })
    .click();
  await page.getByRole("button", { name: "Joie", exact: true }).click();
  await page.getByRole("button", { name: "Entrer dans mon univers" }).click();
  await expect(
    page.getByRole("img", { name: /Univers émotionnel simplifié/ }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Image PNG", exact: true }).click();
  expect((await download).suggestedFilename()).toContain(".png");
});
test("saved compositions keep their seed and survive context loss", async ({
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
  await page.locator('input[type="file"]').setInputFiles({
    name: "sky.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(composition)),
  });
  await expect(page.locator("canvas")).toHaveAttribute("data-sky-seed", "7331");
  await page
    .locator("canvas")
    .evaluate((c) =>
      c.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(
    page.getByRole("img", { name: /Univers émotionnel simplifié/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Autre univers" }).click();
  await expect(
    page.getByRole("slider", { name: "Présence Une marge", exact: true }),
  ).toHaveValue("82");
});

test("native mobile pinch changes the camera field and remains controllable", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await birth(page);
  const canvas = page.locator("canvas");
  await page.getByRole("button", { name: "◉ Contempler", exact: true }).click();
  const fov = Number(await canvas.getAttribute("data-camera-fov"));
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 145, y: 390, id: 1 },
      { x: 225, y: 390, id: 2 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: 130, y: 390, id: 1 },
      { x: 240, y: 390, id: 2 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: 90, y: 390, id: 1 },
      { x: 280, y: 390, id: 2 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-camera-fov")))
    .toBeLessThan(fov - 2);
  await page.getByRole("button", { name: "Mettre en pause" }).click();
  await expect(
    page.getByRole("button", { name: "Reprendre l’expérience" }),
  ).toBeVisible();
});

test("CosmoMood contemplation stays in place and travelling resumes the same world", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /CosmoMood/ })).toBeVisible();
  await page
    .getByRole("button", { name: "Composer mon univers", exact: true })
    .click();
  await page.getByRole("button", { name: "Joie", exact: true }).click();
  await page.getByRole("button", { name: "Tristesse", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Joie", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Tristesse", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "◉ Contempler", exact: true }).click();
  await page.getByRole("button", { name: "Entrer dans mon univers" }).click();
  const canvas = page.locator("canvas");
  await expect
    .poll(() => canvas.getAttribute("data-camera-position"))
    .not.toBeNull();
  const seed = await canvas.getAttribute("data-sky-seed"),
    position = await canvas.getAttribute("data-camera-position");
  await page.waitForTimeout(300);
  await expect(canvas).toHaveAttribute("data-camera-position", position);
  await page.getByRole("button", { name: "↗ Voyager", exact: true }).click();
  await expect
    .poll(() => canvas.getAttribute("data-camera-position"))
    .not.toBe(position);
  await expect(canvas).toHaveAttribute("data-sky-seed", seed);
});

test("gyro permission, relative calibration, sensor motion, recenter and tactile fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    DeviceOrientationEvent.requestPermission = async () => "granted";
  });
  await birth(page);
  await page.getByRole("button", { name: "◉ Contempler", exact: true }).click();
  const canvas = page.locator("canvas"),
    position = await canvas.getAttribute("data-camera-position");
  await page
    .getByRole("button", { name: "Gyroscope 360", exact: true })
    .click();
  await page.evaluate(() =>
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientation", {
        alpha: 0,
        beta: 90,
        gamma: 0,
      }),
    ),
  );
  await expect(
    page.getByRole("button", { name: "Gyroscope 360", exact: true }),
  ).toContainText("actif");
  await page.waitForTimeout(300);
  const initial = await canvas.getAttribute("data-camera-quaternion");
  await page.evaluate(() =>
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientation", {
        alpha: 50,
        beta: 90,
        gamma: 0,
      }),
    ),
  );
  await expect
    .poll(() => canvas.getAttribute("data-camera-quaternion"))
    .not.toBe(initial);
  await expect(canvas).toHaveAttribute("data-camera-position", position);
  await page.getByRole("button", { name: "Recentrer", exact: true }).click();
  await page
    .getByRole("button", { name: "Gyroscope 360", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Gyroscope 360", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await canvas.focus();
  const before = await canvas.getAttribute("data-camera-quaternion");
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => canvas.getAttribute("data-camera-quaternion"))
    .not.toBe(before);
});
test("gyro refusal keeps tactile navigation available", async ({ page }) => {
  await page.addInitScript(() => {
    DeviceOrientationEvent.requestPermission = async () => "denied";
  });
  await birth(page);
  await page
    .getByRole("button", { name: "Gyroscope 360", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("refusée");
  await expect(
    page.getByRole("button", { name: "Gyroscope 360", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("generative audio produces a bounded non-silent signal", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Real = window.AudioContext;
    window.AudioContext = class extends Real {
      createGain() {
        const gain = super.createGain();
        if (!this.__tap) {
          this.__tap = this.createAnalyser();
          gain.connect(this.__tap);
          window.__musicTap = this.__tap;
        }
        return gain;
      }
    };
  });
  await birth(page);
  await page
    .getByRole("button", { name: "Activer le son", exact: true })
    .click();
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const analyser = window.__musicTap;
          if (!analyser) return 0;
          const data = new Float32Array(analyser.fftSize);
          analyser.getFloatTimeDomainData(data);
          return Math.sqrt(
            data.reduce((sum, v) => sum + v * v, 0) / data.length,
          );
        }),
      { timeout: 6000 },
    )
    .toBeGreaterThan(0.0001);
  expect(
    await page.evaluate(() => {
      const analyser = window.__musicTap,
        data = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(data);
      return Math.max(...data.map(Math.abs));
    }),
  ).toBeLessThan(0.9);
});

test("music drives measured energy and pigment releases; poetry remains optional", async ({
  page,
}) => {
  await birth(page);
  await page
    .getByRole("button", { name: "Activer le son", exact: true })
    .click();
  const canvas = page.locator("canvas");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-audio-energy")), {
      timeout: 6000,
    })
    .toBeGreaterThan(0.001);
  await expect
    .poll(
      async () => Number(await canvas.getAttribute("data-pigment-releases")),
      { timeout: 7000 },
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Ouvrir les options" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Poésie flottante" }),
  ).toBeChecked();
  await page.getByRole("checkbox", { name: "Poésie flottante" }).uncheck();
  await page.getByRole("button", { name: "Fermer les réglages" }).click();
  await page
    .getByRole("button", { name: "Mettre en pause", exact: true })
    .click();
  await page.waitForTimeout(150);
  const releases = await canvas.getAttribute("data-pigment-releases");
  await page.waitForTimeout(300);
  await expect(canvas).toHaveAttribute("data-pigment-releases", releases);
});

test("360 activation stops FPV and supports absolute-only device events", async ({
  page,
}) => {
  await page.addInitScript(() => {
    DeviceOrientationEvent.requestPermission = async () => "granted";
  });
  await birth(page);
  const canvas = page.locator("canvas");
  await page
    .getByRole("button", { name: "Gyroscope 360", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "↗ Voyager", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(150);
  const position = await canvas.getAttribute("data-camera-position");
  await page.evaluate(() =>
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientationabsolute", {
        alpha: 12,
        beta: 80,
        gamma: 0,
      }),
    ),
  );
  await expect(
    page.getByRole("button", { name: "Gyroscope 360", exact: true }),
  ).toContainText("actif");
  await page.waitForTimeout(300);
  await expect(canvas).toHaveAttribute("data-camera-position", position);
});

test("miniature orb previews the selected world and opens it on tap", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Composer mon univers", exact: true })
    .click();
  const orb = page.getByRole("button", {
    name: "Entrer dans mon univers",
    exact: true,
  });
  await expect(orb).toBeDisabled();
  await expect(page.locator(".cosmo-orb canvas")).toBeVisible();
  await page.getByRole("button", { name: "Joie", exact: true }).click();
  await page.getByRole("button", { name: "Tristesse", exact: true }).click();
  await expect(orb).toBeEnabled();
  await expect(page.locator(".cosmo-orb canvas")).toHaveAttribute(
    "data-sky-seed",
    /\d+/,
  );
  const seed = await page
    .locator(".cosmo-orb canvas")
    .getAttribute("data-sky-seed");
  await orb.click();
  await expect(page.locator(".sensory-world canvas")).toHaveAttribute(
    "data-sky-seed",
    seed,
  );
  await expect(page.locator(".cosmo-emotion-disc")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Autre univers", exact: true })
    .click();
  await expect(page.locator(".cosmo-emotion-disc")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Joie", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("24 emoji nuances keep selections across orbit pages and enforce the same three-choice limit", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Composer mon univers", exact: true })
    .click();
  await page.getByRole("button", { name: "Joie", exact: true }).click();
  await page
    .getByRole("button", { name: "Émojis suivants", exact: true })
    .click();
  await page.getByRole("button", { name: "Tendresse", exact: true }).click();
  await page
    .getByRole("button", { name: "Émojis suivants", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Émerveillement", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Fatigue", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("slider", { name: "Présence Joie" }),
  ).toBeVisible();
  await expect(
    page.getByRole("slider", { name: "Présence Tendresse" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Émojis suivants", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Joie", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Entrer dans mon univers", exact: true })
    .click();
  await expect(page.locator(".sensory-world canvas")).toBeVisible();
});
