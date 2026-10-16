import { LICENSES } from "./catalog.js";
export function birdCreditsText(birds) {
  return (
    "SUNOIZO — Crédits des enregistrements iNaturalist\n\n" +
    Object.values(birds?.used || {})
      .map(
        (item) =>
          `${item.commonName} (${item.species})\nAuteur : ${item.author}\nSource : ${item.source}\nLicence : ${LICENSES[item.license]?.name} — ${LICENSES[item.license]?.url}\nUtilisation : extrait des 45 premières secondes maximum, bouclé et mixé à la sculpture sonore, avec fondus.\n`,
      )
      .join("\n") +
    "\nCes crédits accompagnent toute vidéo partagée contenant les chants sous CC BY.\n"
  );
}
export function downloadBirdCredits(birds) {
  const url = URL.createObjectURL(
    new Blob([birdCreditsText(birds)], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "SUNOIZO-credits-oiseaux.txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
