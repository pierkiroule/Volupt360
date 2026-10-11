export function formatTime(seconds = 0) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export default function AudioTrack({
  track,
  playback,
  selected,
  loading,
  error,
  onFile,
  onToggle,
  onLoop,
}) {
  const fileReady = Boolean(track);
  const currentLoop = selected === null ? null : track?.loops[selected];
  const progress = fileReady ? (playback.position / track.duration) * 100 : 0;
  return (
    <section
      className="audio-track"
      aria-label="Piste audio et sélection des boucles"
    >
      <div className="track-toolbar">
        <button
          className="play-button"
          onClick={onToggle}
          disabled={!fileReady || loading}
          aria-label={playback.playing ? "Mettre en pause" : "Lire la boucle"}
        >
          {playback.playing ? "Ⅱ" : "▶"}
        </button>
        <label
          className="file-button"
          title="Importer une musique"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.currentTarget.querySelector("input").click();
            }
          }}
        >
          <span aria-hidden="true">＋</span>
          <span className="file-label">MP3</span>
          <input
            type="file"
            accept="audio/*,.mp3"
            aria-label="Importer un fichier audio"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onFile(file);
            }}
          />
        </label>
        <div className="track-name">
          <span>
            {loading
              ? "Le paysage écoute…"
              : track?.name || "Votre musique, un paysage"}
          </span>
          <small>
            {fileReady
              ? `${track.loops.length} phrases · ${track.bpm ? `≈ ${track.bpm} BPM` : "découpage libre"}`
              : "Importer un MP3 pour faire naître l’aquarelle"}
          </small>
        </div>
        <button
          className="whole-track"
          disabled={!fileReady || loading}
          aria-pressed={selected === null}
          onClick={() => onLoop(null)}
        >
          MP3 entier <span aria-hidden="true">↻</span>
        </button>
      </div>
      <div
        className={`waveform ${fileReady ? "is-ready" : ""}`}
        role="group"
        aria-label="Boucles automatiques"
      >
        <div className="waveform-bars" aria-hidden="true">
          {(
            track?.waveform ||
            Array.from(
              { length: 180 },
              (_, i) => 0.12 + Math.sin(i * 0.17) ** 2 * 0.32,
            )
          ).map((value, i) => (
            <i key={i} style={{ height: `${Math.max(5, value * 90)}%` }} />
          ))}
        </div>
        {track?.loops.map((loop, i) => (
          <button
            key={loop.id}
            className="loop-region"
            aria-pressed={selected === i}
            aria-label={`Boucle ${i + 1} : ${formatTime(loop.start)} à ${formatTime(loop.end)}`}
            title={`Boucle ${i + 1} · ${formatTime(loop.start)} — ${formatTime(loop.end)}`}
            onClick={() => onLoop(i)}
            disabled={loading}
            style={{
              left: `${(loop.start / track.duration) * 100}%`,
              width: `${((loop.end - loop.start) / track.duration) * 100}%`,
            }}
          >
            <span className="loop-marker">
              {String(i + 1).padStart(2, "0")}
            </span>
          </button>
        ))}
        {fileReady && (
          <span
            className="playhead"
            style={{ left: `${Math.min(100, progress)}%` }}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="track-caption">
        <span role="status">
          {error ||
            (loading
              ? "Analyse des phrases musicales…"
              : fileReady
                ? currentLoop
                  ? `Boucle ${selected + 1} · ${formatTime(currentLoop.start)} — ${formatTime(currentLoop.end)}`
                  : "Le morceau entier se répète"
                : "Sélectionnez ensuite une phrase sur la piste")}
        </span>
        <span className="track-time" aria-label="Temps de lecture">
          {formatTime(playback.position)} / {formatTime(track?.duration)}
        </span>
      </div>
    </section>
  );
}
