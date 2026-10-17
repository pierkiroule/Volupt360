const views = [
  ["drone", "Vol FPV", "Piloter le regard au cœur de la sculpture"],
  ["gyro", "FPV 360° gyro", "Regard panoramique avec le gyroscope"],
];

export default function CameraViews({
  mode,
  onChange,
  onToggleGlobal,
  compact = false,
  expanded = true,
  disabled = false,
}) {
  return (
    <>
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
      </nav>
      <button
        className="global-view-toggle"
        aria-label="Vue globale 360°"
        aria-pressed={mode === "global"}
        title={
          mode === "global"
            ? "Revenir à la vue précédente"
            : "Voir et faire pivoter toute l’œuvre"
        }
        disabled={disabled}
        onClick={onToggleGlobal}
      >
        <span aria-hidden="true">◎</span>
        <small>360°</small>
      </button>
    </>
  );
}
