export function EchoChamberControls({ value, onChange }) {
  return (
    <details className="echo-chamber-controls">
      <summary>ÉCHORÉMANENCE•°</summary>
      <label>
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(event) =>
            onChange({ ...value, enabled: event.target.checked })
          }
        />{" "}
        Le ciel se souvient
      </label>
      <label>
        Présence{" "}
        <input
          aria-label="Présence du ciel"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={value.presence}
          onChange={(event) =>
            onChange({ ...value, presence: Number(event.target.value) })
          }
        />
      </label>
      <label>
        Mémoire{" "}
        <input
          aria-label="Mémoire du ciel"
          type="range"
          min="60"
          max="360"
          step="10"
          value={value.memory}
          onChange={(event) =>
            onChange({ ...value, memory: Number(event.target.value) })
          }
        />
      </label>
    </details>
  );
}
