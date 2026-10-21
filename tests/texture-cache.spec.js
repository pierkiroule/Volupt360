import { test, expect } from "@playwright/test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { offlinePlugin } from "../build/offlinePlugin.js";
test("new nested images are precached and changing an image invalidates the offline version", async () => {
  const folder = await mkdtemp(join(tmpdir(), "squibble-textures-"));
  try {
    await mkdir(join(folder, "textures/emojis/test"), { recursive: true });
    const path = join(folder, "textures/emojis/test/01-base.jpg");
    await writeFile(path, "first image");
    const plugin = offlinePlugin();
    plugin.configResolved({ base: "/", publicDir: folder });
    let source;
    const context = {
      emitFile(asset) {
        source = asset.source;
      },
    };
    plugin.generateBundle.call(
      context,
      {},
      { "index.html": { source: "app" }, "assets/app.js": { code: "app" } },
    );
    const first = source;
    await writeFile(path, "replacement image");
    plugin.generateBundle.call(
      context,
      {},
      { "index.html": { source: "app" }, "assets/app.js": { code: "app" } },
    );
    expect(source).toContain("/textures/emojis/test/01-base.jpg");
    expect(source.split("\n")[0]).not.toBe(first.split("\n")[0]);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
