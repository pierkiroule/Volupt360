export async function createBrush(page, seed = 1) {
  await page
    .getByRole("button", { name: "Créer une brosse", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom", { exact: true }).fill(`Matière ${seed}`);
  await dialog
    .getByLabel("Forme", { exact: true })
    .selectOption(seed % 2 ? "voiles" : "filaments");
  await dialog
    .getByLabel("Couleur", { exact: true })
    .fill(seed % 2 ? "#208578" : "#d44763");
  await dialog
    .getByLabel("Effet", { exact: true })
    .selectOption(seed % 2 ? "Lavis" : "Nervures");
  await dialog
    .getByRole("button", { name: "Créer la brosse", exact: true })
    .click();
}
