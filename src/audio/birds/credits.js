import { LICENSES } from "./catalog.js";
export function mediaCredit(item) {
  return `${item.commonName}\nAuteur : ${item.author}\n${item.credit ? `Crédit fourni : ${item.credit}\n` : ""}Source : ${item.source}\nLicence : ${item.licenseName || LICENSES[item.license]?.name} — ${item.licenseUrl || LICENSES[item.license]?.url}\n${item.shareAlike ? "Condition CC BY-SA : adaptations combinées sous CC BY-SA 4.0, avec attribution et indication des modifications.\n" : ""}`;
}
export function birdCreditsText(birds) {
  const photos = [
    ...new Map(
      Object.values(birds?.assignments || {})
        .filter((item) => item?.photo)
        .map((item) => [item.photo.pageid, item.photo]),
    ).values(),
  ];
  return (
    "SUNOIZO — Matières et chants Wikimedia Commons\n\nPHOTOGRAPHIES\n\n" +
    photos
      .map(
        (photo) =>
          mediaCredit(photo) +
          "Transformation : palette, contours et texture analysés puis recomposés en matière abstraite.\n",
      )
      .join("\n") +
    "\nCHANTS\n\n" +
    Object.values(birds?.used || {})
      .map(
        (item) =>
          mediaCredit(item) +
          "Utilisation : extrait jusqu’à 45 s, bouclé et mixé avec fondus.\n",
      )
      .join("\n") +
    "\nConserver ces attributions avec les images et vidéos partagées. Pour les médias CC BY-SA, respecter également le partage à l’identique des adaptations.\n"
  );
}
export function downloadBirdCredits(birds) {
  const url = URL.createObjectURL(
    new Blob([birdCreditsText(birds)], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "SUNOIZO-credits-commons.txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
