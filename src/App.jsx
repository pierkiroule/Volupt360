import { useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import CameraViews from "./components/CameraViews.jsx";
import ControlPanel from "./components/ControlPanel.jsx";
import { createSoundNest } from "./engine/createSoundNest.js";
import { createLoopPlayer } from "./audio/createLoopPlayer.js";
import { createPredefinedTexture } from "./engine/predefinedTextures.js";
import { analyzeLoops } from "./audio/analyzeLoops.js";
import { ENABLE_SONOIZO } from "./sonoizo/config.js";
import { useTwigBank } from "./sonoizo/useTwigBank.js";
import TwigWorkshop from "./components/TwigWorkshop.jsx";

const initialPlayback = { playing: false, position: 0, duration: 0 };

export default function App() {
  const twigs = useTwigBank();
  const [universe, setUniverse] = useState(null);
  const [universeError, setUniverseError] = useState("");
  const [atelier, setAtelier] = useState(() =>
    !ENABLE_SONOIZO ||
    new URLSearchParams(location.search).get("atelier") === "mp3"
      ? "mp3"
      : new URLSearchParams(location.search).get("samples") === "empty"
        ? "cueillir"
        : "jouer",
  );
  const [photoAsset, setPhotoAsset] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  useEffect(
    () => () => {
      if (photoAsset) URL.revokeObjectURL(photoAsset.url);
    },
    [photoAsset],
  );
  const [video, setVideo] = useState(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoError, setVideoError] = useState("");
  const videoRequest = useRef(0);
  useEffect(
    () => () => {
      videoRequest.current++;
    },
    [],
  );
  useEffect(
    () => () => {
      if (video) URL.revokeObjectURL(video.url);
    },
    [video],
  );
  const [toolsOpen, setToolsOpen] = useState(
    new URLSearchParams(location.search).get("samples") === "empty",
  );
  const immersive = ENABLE_SONOIZO && atelier !== "mp3";
  const stage = useRef(null),
    engine = useRef(null),
    player = useRef(null),
    loadRequest = useRef(0);
  const textureRequests = useRef({});
  const [distance, setDistance] = useState(0.25);
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
      ? "echohypnosis — L’Oizo échohypnotique"
      : "NID SONORE•° — Paysages d’aquarelle";
    try {
      engine.current = createSoundNest(stage.current, {
        onHint: setHint,
        onError: setSceneError,
      });
      if (ENABLE_SONOIZO && atelier !== "mp3") {
        if (new URLSearchParams(location.search).has("samples"))
          engine.current.setPadSource(twigs.bank.current);
        engine.current.setDroneDistance(0.25);
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

  async function enterUniverse() {
    const bank = twigs.bank.current;
    if (!bank) return;
    void bank.preparePlayback();
    setUniverse("souffle");
    engine.current?.setPadSource(bank);
    const loaded = await bank.loadUniverseAmbience(
      `${import.meta.env.BASE_URL}ambiances/ambiance01.mp3`,
    );
    if (loaded) await bank.toggleAmbience();
    else
      setUniverseError(
        "L’ambiance de cet univers est indisponible : ambiance01.mp3 manque ou ne peut pas être lu.",
      );
  }
  async function loadTexture(id, preset) {
    const owner = engine.current;
    const request = (textureRequests.current[id] || 0) + 1;
    textureRequests.current[id] = request;
    setError("");
    try {
      const binding = createPredefinedTexture(preset);
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
        [id]: { preview: binding.preview, name: binding.name, id: binding.id },
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
  async function exportPhoto() {
    if (photoBusy || videoBusy) return;
    const ticket = ++videoRequest.current;
    setPhotoBusy(true);
    setVideoError("");
    try {
      const blob = await engine.current.exportPhoto();
      if (ticket !== videoRequest.current) return;
      const asset = {
        url: URL.createObjectURL(blob),
        name: `Oizodio-photo-${Date.now()}.png`,
      };
      setPhotoAsset(asset);
      const link = document.createElement("a");
      link.href = asset.url;
      link.download = asset.name;
      link.click();
    } catch (cause) {
      if (ticket === videoRequest.current) setVideoError(cause.message);
    } finally {
      if (ticket === videoRequest.current) setPhotoBusy(false);
    }
  }
  async function exportVideo() {
    if (videoBusy) return;
    const ticket = ++videoRequest.current;
    setVideoBusy(true);
    setVideoError("");
    setVideoProgress(0);
    try {
      const result = await engine.current.exportVideodio((value) => {
        if (ticket === videoRequest.current) setVideoProgress(value);
      });
      if (ticket !== videoRequest.current) return;
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      setVideo({
        url: URL.createObjectURL(result.blob),
        name: `Oizodio-${stamp}.${result.extension}`,
      });
    } catch (cause) {
      if (ticket === videoRequest.current) setVideoError(cause.message);
    } finally {
      if (ticket === videoRequest.current) setVideoBusy(false);
    }
  }
  function chooseCamera(id) {
    if (id === "photo") {
      twigs.bank.current?.cancelRecording();
      setToolsOpen(false);
      setAtelier("jouer");
    }
    if (id === "gyro") void twigs.bank.current?.preparePlayback();
    if (universe && mode === "photo" && id !== "photo") {
      const ambience = twigs.bank.current?.getSnapshot().ambience;
      if (ambience?.loaded && !ambience.playing)
        void twigs.bank.current.toggleAmbience();
    }
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
    if (next === "cueillir") setToolsOpen(true);
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
    <main
      className={
        immersive
          ? `immersive ${toolsOpen ? "tools-open" : "tools-closed"}`
          : undefined
      }
    >
      <div id="stage" ref={stage} />
      <Header sonoizo={ENABLE_SONOIZO} />
      {immersive &&
        !universe &&
        !new URLSearchParams(location.search).has("samples") && (
          <section className="universe-picker" aria-label="Choisir un univers">
            <h2>Choisissez votre univers</h2>
            <p>Un souffle, des cordes, un paysage à sculpter.</p>
            <div className="universe-options">
              <button onClick={enterUniverse}>
                Le Souffle <span>Entrer</span>
              </button>
              <button disabled>
                Les Marées <span>Bientôt</span>
              </button>
              <button disabled>
                La Ramure <span>Bientôt</span>
              </button>
            </div>
          </section>
        )}
      {universeError && (
        <p className="universe-error" role="alert">
          {universeError}
        </p>
      )}
      <CameraViews
        disabled={videoBusy || photoBusy}
        compact={immersive}
        expanded={!immersive || toolsOpen}
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
        <span>Glisser pour guider · les brosses pour sculpter</span>
      </div>
      {immersive && mode !== "photo" && (
        <button
          className="atelier-toggle"
          aria-label={
            toolsOpen
              ? "Replier les fonctionnalités"
              : "Déplier les fonctionnalités"
          }
          aria-expanded={toolsOpen}
          aria-controls="atelier-tools"
          onClick={() => {
            if (toolsOpen) chooseAtelier("jouer");
            setToolsOpen(!toolsOpen);
          }}
        >
          <span aria-hidden="true">{toolsOpen ? "−" : "+"}</span>
        </button>
      )}
      {ENABLE_SONOIZO && (!immersive || toolsOpen) && (
        <nav
          id="atelier-tools"
          className={`atelier-nav ${atelier !== "mp3" ? "with-twigs" : ""}`}
          aria-label="Atelier sonore"
        >
          {[
            [
              "cueillir",
              new URLSearchParams(location.search).get("samples") === "empty"
                ? "Mes sons"
                : twigs.snapshot.fireflies
                  ? "Textures"
                  : "Poèmes",
            ],
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

      {mode === "photo" && immersive ? (
        <section className="photo-panel" aria-label="Cadrer une vidéodio">
          <p>Glisser pour tourner · pincer ou molette pour zoomer</p>
          <div className="photo-actions">
            <button
              aria-label="Dézoomer la photo"
              disabled={videoBusy || photoBusy}
              onClick={() => {
                const zoom = Number(
                  stage.current.querySelector("canvas").dataset.photoZoom || 1,
                );
                engine.current?.setPhotoZoom(zoom * 1.2);
              }}
            >
              −
            </button>
            <button
              aria-label="Zoomer la photo"
              disabled={videoBusy || photoBusy}
              onClick={() => {
                const zoom = Number(
                  stage.current.querySelector("canvas").dataset.photoZoom || 1,
                );
                engine.current?.setPhotoZoom(zoom / 1.2);
              }}
            >
              +
            </button>
            <button onClick={exportVideo} disabled={videoBusy || photoBusy}>
              {videoBusy
                ? `Création… ${Math.round(videoProgress * 100)} %`
                : "Créer ma vidéodio · 10 s"}
            </button>
          </div>
          <button
            className="photo-download"
            onClick={exportPhoto}
            disabled={videoBusy || photoBusy}
          >
            {photoBusy ? "Photo…" : "Télécharger la photo · PNG HD"}
          </button>
          <small>
            Vidéo : uniquement votre vol FPV, avec son audio synchronisé
          </small>
          {photoAsset && (
            <a href={photoAsset.url} download={photoAsset.name}>
              Retélécharger la photo PNG HD
            </a>
          )}
          {videoError && <p role="alert">{videoError}</p>}
          {video && (
            <a href={video.url} download={video.name}>
              Télécharger ma vidéodio
            </a>
          )}
        </section>
      ) : atelier !== "mp3" ? (
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
