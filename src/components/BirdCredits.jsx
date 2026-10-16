export default function BirdCredits({ birds, brush }) {
  const photo = birds?.assignments?.[brush]?.photo;
  if (!photo) return null;
  return (
    <details className="bird-credits">
      <summary>{photo.commonName}</summary>
      <p>
        Photo analysée sur votre appareil, sans envoi à un serveur. Les matières
        restent dans cette session.
      </p>
    </details>
  );
}
