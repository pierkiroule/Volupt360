const views = [
  ["drone", "FPV drone", "Voyage en drone dans le sillage du pinceau"],
  ["gyro", "FPV 360° gyro", "Regard panoramique avec le gyroscope"],
];

export default function CameraViews({ mode, onChange, distance, onDistance }) {
  return (
    <nav className="camera-views" aria-label="Vues caméra">
      {views.map(([id, label, title], index) => (
        <button
          key={id}
          aria-pressed={mode === id}
          title={title}
          onClick={() => onChange(id)}
        >
          <span className="view-number" aria-hidden="true">
            0{index + 1}
          </span>
          {label}
        </button>
      ))}
      {mode === "drone" && (
        <label className="drone-distance">
          <span>Distance</span>
          <input
            aria-label="Distance du drone"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={distance}
            onChange={(event) => onDistance(Number(event.target.value))}
          />
          <span aria-hidden="true">Proche · Ensemble</span>
        </label>
      )}
    </nav>
  );
}
