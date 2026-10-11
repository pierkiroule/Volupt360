import { useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import CameraViews from "./components/CameraViews.jsx";
import ControlPanel from "./components/ControlPanel.jsx";
import { createSoundNest } from "./engine/createSoundNest.js";
import { createLoopPlayer } from "./audio/createLoopPlayer.js";
import { importBrushTexture } from "./engine/importBrushTexture.js";
import { analyzeLoops } from "./audio/analyzeLoops.js";
import { ENABLE_SONOIZO } from "./sonoizo/config.js";
import { useTwigBank } from "./sonoizo/useTwigBank.js";
import TwigWorkshop from "./components/TwigWorkshop.jsx";

const initialPlayback = { playing: false, position: 0, duration: 0 };

export default function App() {
  const twigs = useTwigBank();
  const [atelier, setAtelier] = useState(() =>
    !ENABLE_SONOIZO ||
    new URLSearchParams(location.search).get("atelier") === "mp3"
      ? "mp3"
      : "cueillir",
  );
  const stage = useRef(null),
    engine = useRef(null),
    player = useRef(null),
    loadRequest = useRef(0);
  const textureRequests = useRef({});
  const [distance, setDistance] = useState(atelier === "mp3" ? 0.25 : 0.55);
  const [textures, setTextures] = useState({});
  const [mode, setMode] = useState("drone"),
    [brush, setBrush] = useState("voiles");
  const [hint, setHint] = useState("Dans le sillage du pinceau · voyage en 3D");
  const [track, setTrack] = useState(null),
    [selected, setSelected] = useState(null);
  const [playback, setPlayback] = useState(initialPlayback);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [sceneError, setSceneError] = useState("");

  useEffect(() => {
    document.title = ENABLE_SONOIZO
      ? "SONOÏZO•° — Le chant qui sculpte l’espace des possibles"
      : "NID SONORE•° — Paysages d’aquarelle";
    try {
      engine.current = createSoundNest(stage.current, {
        onHint: setHint,
        onError: setSceneError,
      });
      if (ENABLE_SONOIZO && atelier !== "mp3") {
        engine.current.setPadSource(twigs.bank.current);
        engine.current.setDroneDistance(0.55);
      }
    } catch (cause) {
      setSceneError(
        `La scène ne peut pas démarrer. Vérifiez WebGL : ${cause.message}`,
      );
    }
    return () => {
      loadRequest.current++;
      engine.current?.dispose();
      engine.current = null;
      player.current?.dispose();
      player.current = null;
    };
  }, []);

  async function loadTexture(id, file) {
    const owner = engine.current;
    const request = (textureRequests.current[id] || 0) + 1;
    textureRequests.current[id] = request;
    setError("");
    try {
      const binding = await importBrushTexture(file);
      if (
        !owner ||
        engine.current !== owner ||
        textureRequests.current[id] !== request
      ) {
        binding.texture.dispose();
        return;
      }
      owner.setBrushTexture(id, binding);
      setTextures((previous) => ({
        ...previous,
        [id]: { preview: binding.preview, name: binding.name },
      }));
    } catch (cause) {
      if (engine.current === owner && textureRequests.current[id] === request)
        setError(`Texture : ${cause.message}`);
    }
  }

  function chooseBrush(id) {
    setBrush(id);
    engine.current?.setBrush(id);
  }
  function chooseCamera(id) {
    setMode(id);
    void engine.current?.setCameraMode(id);
  }
  async function loadFile(file) {
    const request = ++loadRequest.current;
    setLoading(true);
    setError("");
    try {
      if (!player.current) {
        player.current = createLoopPlayer();
        engine.current?.setPlayer(player.current, setPlayback);
      }
      player.current.pause();
      setPlayback(player.current.getState());
      const buffer = await player.current.decode(file);
      if (request !== loadRequest.current) return;
      const analysis = analyzeLoops(buffer);
      player.current.setBuffer(buffer);
      engine.current?.reset();
      engine.current?.setTrackComposition(analysis);
      setTrack({ name: file.name, duration: buffer.duration, ...analysis });
      setSelected(null);
      try {
        await player.current.play();
      } catch {
        if (request === loadRequest.current)
          setError("Appuyez sur lecture pour démarrer la musique.");
      }
      if (request === loadRequest.current)
        setPlayback(player.current.getState());
    } catch (cause) {
      if (request === loadRequest.current)
        setError(`Ce fichier audio ne peut pas être ouvert. ${cause.message}`);
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }
  async function togglePlayback() {
    try {
      if (player.current?.getState().playing) player.current.pause();
      else await player.current?.play();
      if (player.current) setPlayback(player.current.getState());
      setError("");
    } catch (cause) {
      setError(`Lecture indisponible : ${cause.message}`);
    }
  }
  function chooseLoop(index) {
    setSelected(index);
    player.current?.selectLoop(index === null ? null : track.loops[index]);
    if (player.current) setPlayback(player.current.getState());
  }
  function chooseAtelier(next) {
    twigs.bank.current?.cancelRecording();
    twigs.bank.current?.stopAll();
    twigs.clearError();
    if (next !== "mp3") {
      loadRequest.current++;
      setLoading(false);
      player.current?.pause();
      if (player.current) setPlayback(player.current.getState());
    }
    engine.current?.setPadSource(next === "mp3" ? null : twigs.bank.current);
    setAtelier(next);
  }
  return (
    <main>
      <div id="stage" ref={stage} />
      <Header sonoizo={ENABLE_SONOIZO} />
      <CameraViews
        mode={mode}
        onChange={chooseCamera}
        distance={distance}
        onDistance={(value) => {
          setDistance(value);
          engine.current?.setDroneDistance(value);
        }}
      />
      <p className="view-hint" role="status">
        {hint}
      </p>
      <div className="landscape-caption" aria-hidden="true">
        <span>UN VOYAGE DANS LA MATIÈRE</span>
        <span>Glisser pour tourner · le son pour peindre</span>
      </div>
      {ENABLE_SONOIZO && (
        <nav
          className={`atelier-nav ${atelier !== "mp3" ? "with-twigs" : ""}`}
          aria-label="Atelier sonore"
        >
          {[
            ["cueillir", "Mes sons"],
            ["jouer", "Jouer"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={atelier === id}
              onClick={() => chooseAtelier(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
      {atelier !== "mp3" ? (
        <TwigWorkshop
          mode={atelier}
          {...twigs}
          textures={textures}
          onTexture={loadTexture}
        />
      ) : (
        <ControlPanel
          brush={brush}
          onBrush={chooseBrush}
          textures={textures}
          onTexture={loadTexture}
          track={track}
          playback={playback}
          selected={selected}
          loading={loading}
          error={error}
          onFile={loadFile}
          onToggle={togglePlayback}
          onLoop={chooseLoop}
        />
      )}
      {sceneError && (
        <p role="alert" className="startup-error">
          {sceneError}
        </p>
      )}
    </main>
  );
}
