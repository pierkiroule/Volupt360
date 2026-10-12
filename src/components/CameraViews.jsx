const views = [
  ["drone", "FPV drone", "Voyage en drone dans le sillage du pinceau"],
  ["gyro", "FPV 360° gyro", "Regard panoramique avec le gyroscope"],
];

export default function CameraViews({
  mode,
  onChange,
  distance,
  onDistance,
  compact = false,
  expanded = true,
  disabled = false,
}) {
  return (
    <nav
      className={`camera-views ${compact ? "is-compact" : ""}`}
      aria-label="Vues caméra"
    >
      {(compact
        ? [
            ...views,
            [
              "photo",
              "Vue photo",
              "Figer, cadrer et collectionner une vidéodio",
            ],
          ]
        : views
      ).map(([id, label, title], index) => (
        <button
          key={id}
          disabled={disabled}
          aria-label={label}
          aria-pressed={mode === id}
          title={title}
          onClick={() => onChange(id)}
        >
          {compact ? (
            <svg
              aria-hidden="true"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {id === "drone" ? (
                <>
                  <path d="M5 16 12 8 19 16M12 8v11" />
                  <path d="M3 6h4M17 6h4M5 4v4M19 4v4" />
                </>
              ) : id === "photo" ? (
                <>
                  <path d="M3 7h5l2-3h4l2 3h5v13H3z" />
                  <circle cx="12" cy="13" r="4" />
                </>
              ) : (
                <>
                  <circle cx="12" cy="12" r="8" />
                  <ellipse cx="12" cy="12" rx="3.5" ry="8" />
                  <path d="M4 12h16" />
                </>
              )}
            </svg>
          ) : (
            <>
              <span className="view-number" aria-hidden="true">
                0{index + 1}
              </span>
              {label}
            </>
          )}
        </button>
      ))}
      {mode === "drone" && expanded && (
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
