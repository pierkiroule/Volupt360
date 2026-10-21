import { test, expect } from "@playwright/test";

test("dark paper keeps luminous pigment visible in the shared document", async ({
  page,
}) => {
  await page.goto("/");
  const paper = page.locator(".squiggle-paper");
  await expect(paper).toBeVisible();
  await expect(paper).toHaveAttribute("data-animation-time", /[0-9]+\.[0-9]+/);
  const background = await paper.evaluate((c) => [
    ...c.getContext("2d").getImageData(10, 10, 1, 1).data,
  ]);
  expect(background).toEqual([5, 7, 13, 255]);
  const box = await paper.boundingBox();
  await page.mouse.move(box.width * 0.3, box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.width * 0.6, box.height * 0.5, { steps: 20 });
  await page.mouse.up();
  await expect(paper).toHaveAttribute("data-strokes", "1");
  const visible = await paper.evaluate((c) => {
    const { data } = c.getContext("2d").getImageData(0, 0, c.width, c.height);
    let count = 0;
    for (let i = 0; i < data.length; i += 4)
      if (Math.max(data[i], data[i + 1], data[i + 2]) > 90) count++;
    return count;
  });
  expect(visible).toBeGreaterThan(300);
  await page.screenshot({ path: "/tmp/squiggle-dark-2d.png" });
  await page
    .getByRole("button", { name: "Entrer en 360", exact: true })
    .click();
  await expect(page.locator(".squiggle-world canvas")).toHaveAttribute(
    "data-strokes",
    "1",
  );
  await page.screenshot({ path: "/tmp/squiggle-dark-360.png" });
});
