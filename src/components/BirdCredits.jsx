import { downloadBirdCredits } from "../audio/birds/credits.js";
export default function BirdCredits({ birds, brush, onRetry }) {
  const item = birds?.assignments?.[brush];
  return (
    <details className="bird-credits">
      <summary>
        {birds?.state === "playing" ? "♫ " : ""}
        {item?.photo?.commonName ||
          item?.commonName ||
          (birds?.status === "loading"
            ? "Rencontre avec la nature…"
            : "Matières et chants")}
      </summary>
      <p>
        Photographies de nature et chants réels · Wikimedia Commons. Licences
        CC0, domaine public, CC BY et CC BY-SA. Aucun chant synthétique.
      </p>
      {birds?.state === "loading" && (
        <p role="status">Chargement du chant réel…</p>
      )}
      {birds?.error && <p role="status">{birds.error}</p>}
      {["error", "unavailable"].includes(birds?.status) && (
        <button onClick={onRetry}>Réessayer la matière</button>
      )}
      {Object.keys(birds?.assignments || {}).length > 0 && (
        <button onClick={() => downloadBirdCredits(birds)}>
          Télécharger les crédits des matières et chants
        </button>
      )}
      {Object.values(birds?.assignments || {}).some(
        (media) => media?.shareAlike || media?.photo?.shareAlike,
      ) && (
        <p className="share-alike-note">
          Cette collection contient des médias CC BY-SA : partagez leurs
          adaptations sous la même licence ou une licence compatible, en
          conservant les crédits. Cette condition concerne aussi les exports
          photo et vidéo.
        </p>
      )}
      <ul>
        {Object.entries(birds?.assignments || {}).map(([id, recording]) => (
          <li key={id}>
            {id}
            {[recording?.photo, recording].filter(Boolean).map((media) => (
              <p key={media.pageid}>
                <strong>{media.kind === "image" ? "Photo" : "Chant"}</strong> ·{" "}
                <a href={media.source} target="_blank" rel="noreferrer">
                  {media.commonName}
                </a>{" "}
                · {media.author} ·{" "}
                <a href={media.licenseUrl} target="_blank" rel="noreferrer">
                  {media.licenseName}
                </a>
                {media.credit ? ` · ${media.credit}` : ""}
              </p>
            ))}
          </li>
        ))}
      </ul>
      <p>
        Conservez les crédits avec vos images et vidéos partagées. Les photos
        sont transformées en matières abstraites ; les chants sont extraits et
        bouclés avec fondus.
      </p>
    </details>
  );
}
