import { test, expect } from "@playwright/test";

test("Gravity retains an unfiltered stereo path while looping and feeding visual analysis", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = AudioContext.prototype.createMediaElementSource;
    window.__musicGraph = [];
    AudioContext.prototype.createMediaElementSource = function (element) {
      const source = original.call(this, element);
      const connect = source.connect;
      source.connect = function (node, ...args) {
        window.__musicGraph.push({ source, node, element });
        return connect.call(this, node, ...args);
      };
      return source;
    };
  });
  await page.goto("/");
  await page.getByRole("checkbox", { name: /Activer le gyroscope/ }).uncheck();
  await page
    .getByRole("button", { name: "Explorer le ciel", exact: true })
    .click();
  await page.waitForFunction(() =>
    window.__musicGraph.some(({ element }) => !element.paused && element.loop),
  );
  const result = await page.evaluate(() => {
    const music = window.__musicGraph.find(({ element }) =>
      /gravity\.mp3/.test(element.src),
    );
    return {
      destination: music.node.constructor.name,
      stereoMode: music.node.channelCountMode,
      looping: music.element.loop,
      playing: !music.element.paused,
      rate: music.element.playbackRate,
      nativeVolume: music.element.volume,
    };
  });
  expect(result).toEqual({
    destination: "AnalyserNode",
    stereoMode: "max",
    looping: true,
    playing: true,
    rate: 1,
    nativeVolume: 1,
  });
});

test("historical night phase also preserves the original MP3 spectrum", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = AudioContext.prototype.createBiquadFilter;
    window.__audioFilters = [];
    AudioContext.prototype.createBiquadFilter = function () {
      const node = original.call(this);
      window.__audioFilters.push(node);
      return node;
    };
  });
  await page.goto("/?original=1");
  await page.getByRole("checkbox").uncheck();
  await page.getByRole("button", { name: "Prendre son envol" }).click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-experience-phase",
    "night",
  );
  expect(
    await page.evaluate(() => window.__audioFilters.map((node) => node.type)),
  ).toEqual([]);
});
