import BrushSelector from "./BrushSelector.jsx";

// Stable DOM controls form the adapter boundary with the real-time audio engine.
// Uncontrolled ranges let the engine update playback without React rendering per frame.
export default function ControlPanel() {
  return (
    <section className="panel" aria-label="Commandes de peinture sonore">
      <div className="line">
        <button className="upload" id="mic">
          ◉ Activer le micro
        </button>
        <label
          className="upload"
          htmlFor="file"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.currentTarget.parentElement.querySelector("#file").click();
            }
          }}
        >
          ♪ MP3
        </label>
        <input
          id="file"
          type="file"
          accept="audio/*,.mp3"
          aria-label="Importer un fichier audio"
        />
        <button
          id="play"
          style={{ display: "none" }}
          aria-label="Lecture ou pause"
        >
          ▶
        </button>
        <button id="reset">↺ Effacer</button>
        <button id="inside">◉ Drone auto</button>
        <button id="turn360" title="Tour complet autour du tracé">
          ⟳ 360°
        </button>
        <button id="capture" title="Capturer une image PNG haute définition">
          ▣ PNG HD
        </button>
        <span id="status" role="status">
          Micro inactif · HTTPS ou localhost requis
        </span>
      </div>
      <div id="fileRow" className="seek" style={{ display: "none" }}>
        <input
          id="seek"
          type="range"
          min="0"
          max="1000"
          defaultValue="0"
          aria-label="Position de lecture et scratch"
        />
        <span id="time">0:00</span>
        <span
          id="scratchHint"
          title="Glisser pour scratcher ; relâcher pour reprendre"
        >
          ↔ Scratch
        </span>
      </div>
      <BrushSelector />
      <div className="settings">
        <label htmlFor="life">
          Persistance{" "}
          <input id="life" type="range" min="3" max="30" defaultValue="12" />
          <output id="lifeValue" htmlFor="life">
            12
          </output>
        </label>
      </div>
    </section>
  );
}
