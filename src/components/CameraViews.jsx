const views = [
  ["drone", "FPV drone", "Vol immersif au centre du paysage"],
  ["tpv", "TPV", "Vue extérieure de la sculpture"],
  ["gyro", "FPV 360° gyro", "Regard panoramique avec le gyroscope"],
];

export default function CameraViews({ mode, onChange }) {
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
    </nav>
  );
}
