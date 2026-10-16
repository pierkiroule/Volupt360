import { downloadBirdCredits } from "../audio/birds/credits.js";
import { LICENSES } from "../audio/birds/catalog.js";
export default function BirdCredits({ birds, brush, onRetry }) {
  const item = birds?.assignments?.[brush];
  return (
    <details className="bird-credits">
      <summary>
        {birds?.state === "playing" ? "♫ " : ""}
        {item?.commonName ||
          (birds?.status === "loading"
            ? "Les oiseaux arrivent…"
            : "Chants d’oiseaux")}
      </summary>
      <p>
        Chants réels iNaturalist · priorité aux espèces signalées menacées.
        Aucun chant synthétique.
      </p>
      {birds?.state === "loading" && (
        <p role="status">Chargement du chant réel…</p>
      )}
      {birds?.error && <p role="status">{birds.error}</p>}
      {["error", "unavailable"].includes(birds?.status) && (
        <button onClick={onRetry}>Réessayer le catalogue</button>
      )}
      {Object.keys(birds?.used || {}).length > 0 && (
        <button onClick={() => downloadBirdCredits(birds)}>
          Télécharger les crédits des chants
        </button>
      )}
      <ul>
        {Object.entries(birds?.assignments || {}).map(([id, recording]) => (
          <li key={id}>
            {id} —{" "}
            {recording ? (
              <>
                <a href={recording.source} target="_blank" rel="noreferrer">
                  {recording.commonName}
                </a>{" "}
                ({recording.species}) · {recording.author} ·{" "}
                <a
                  href={LICENSES[recording.license]?.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {LICENSES[recording.license]?.name}
                </a>
                {recording.threatened
                  ? " · priorité menacée (iNaturalist)"
                  : ""}{" "}
                · extrait ≤ 45 s, bouclé pendant le geste.
              </>
            ) : (
              "Chant autorisé indisponible — silence"
            )}
          </li>
        ))}
      </ul>
      <p>
        Pour partager une vidéo, conservez ces crédits avec votre œuvre. CC BY
        exige l’attribution de l’auteur, de la source et de la licence.
      </p>
    </details>
  );
}
