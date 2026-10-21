import { test, expect } from "@playwright/test";
test("selection, world, poetic encounter and local nectar", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?colibri");
  await expect(
    page.getByRole("heading", { name: "Squibble le colibris •°" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Choisis tes nuances" }),
  ).toBeDisabled();
  for (const name of ["Courant", "Braise", "Lune"])
    await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: "Éclosion", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Trois ingrédients");
  await page.getByRole("status").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-bubbles", "24");
  await page.getByRole("button", { name: "Entrer dans mon monde" }).click();
  // Automatic flight physically crosses the first bubble, with no debug teleport.
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "Garder cette étincelle" }).click();
  await expect(
    page.getByRole("button", { name: "Retirer du carnet", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reprendre le vol" }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.waitForTimeout(150);
  const before = await page.locator("canvas").getAttribute("data-position");
  await page.waitForTimeout(300);
  expect(await page.locator("canvas").getAttribute("data-position")).toBe(
    before,
  );
  await page.reload();
  await page.getByRole("button", { name: "Mon carnet de nectar" }).click();
  await expect(page.locator(".colibri-notebook > div")).toHaveCount(1);
  expect(errors).toEqual([]);
});
test("seeded resources are diverse, bounded and independent of selection order", async ({
  page,
}) => {
  await page.goto("/?colibri");
  const result = await page.evaluate(async () => {
    const m = await import("/src/colibri/resources.ts");
    const a = m.resourceWorld(["🌊", "🌙"]),
      b = m.resourceWorld(["🌙", "🌊"]),
      c = m.resourceWorld(["🔥"]);
    return {
      a: a.map((r) => r.id),
      b: b.map((r) => r.id),
      c: c.map((r) => r.id),
      kinds: [...new Set(a.map((r) => r.kind))],
    };
  });
  expect(result.a).toHaveLength(24);
  expect(result.a).toEqual(result.b);
  expect(result.a).not.toEqual(result.c);
  expect(result.kinds.length).toBe(4);
});
test("mobile palette fits and original studio remains available", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?colibri");
  await expect(page.locator(".colibri-orbit button")).toHaveCount(12);
  const boxes = await page
    .locator(".colibri-orbit button")
    .evaluateAll((nodes) =>
      nodes.map((n) => {
        const r = n.getBoundingClientRect();
        return { x: r.x, right: r.right, width: r.width };
      }),
    );
  expect(boxes.every((r) => r.x >= 0 && r.right <= 390 && r.width >= 44)).toBe(
    true,
  );
  await page.screenshot({ path: "test-results/colibri-mobile.png" });
  await page.getByRole("link", { name: "L’atelier de dessin" }).click();
  await expect(
    page.getByRole("button", { name: "Créer une œuvre" }),
  ).toBeVisible();
});
