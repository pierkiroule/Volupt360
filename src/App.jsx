import GrowingBrushMenu from "./components/GrowingBrushMenu.jsx";
import {
  createProceduralBrush,
  loadPalette,
  savePalette,
} from "./materials/proceduralBrush.js";
import { ENABLE_BIRD_SONGS } from "./sonoizo/instrumentConfig.js";
import ArtisticIntroduction from "./components/ArtisticIntroduction.jsx";
import { UNIVERSES } from "./sonoizo/universes.js";
import { BRUSHES } from "./engine/brushes.js";
import { useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import CameraViews from "./components/CameraViews.jsx";
import ControlPanel from "./components/ControlPanel.jsx";
import { createSoundNest } from "./engine/createSoundNest.js";
import { createLoopPlayer } from "./audio/createLoopPlayer.js";
import { analyzeLoops } from "./audio/analyzeLoops.js";
import { ENABLE_SONOIZO } from "./sonoizo/config.js";
import { useTwigBank } from "./sonoizo/useTwigBank.js";

const initialPlayback = { playing: false, position: 0, duration: 0 };

export default function App() {
  const twigs = useTwigBank();
  const [collection, setCollection] = useState(() => {
    const saved = loadPalette();
    return saved.length
      ? saved.map((config, index) => ({
          id: BRUSHES[index].id,
          name: config.name,
          color: config.color,
          ready: true,
          config,
        }))
      : [{ id: "voiles", name: "Première brosse", ready: false }];
  });
  const [paletteMessage, setPaletteMessage] = useState("");
  function persistPalette(entries = collection) {
    try {
      savePalette(
        entries.filter((item) => item.ready).map((item) => item.config),
      );
      setPaletteMessage("Palette sauvegardée sur cet appareil");
    } catch {
      setPaletteMessage(
        "Sauvegarde indisponible : votre palette reste dans cette session.",
      );
    }
  }
  const [creatingBrush, setCreatingBrush] = useState(false);
  const [brushError, setBrushError] = useState("");
  const brushBusy = useRef(false),
    brushTicket = useRef(0);
  const [universe, setUniverse] = useState(null);
  const atmosphereRef = useRef({ echo: 0.5, hypnos: 0.3 });
  const universeRequest = useRef(0);
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
  const [distance, setDistance] = useState(0);
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
      ? "ÉCHO & HYPNOS •° — Les matières du monde prennent forme"
      : "NID SONORE•° — Paysages d’aquarelle";
    try {
      engine.current = createSoundNest(stage.current, {
        onHint: setHint,
        onError: setSceneError,
      });
      if (collection.some((item) => item.ready)) {
        setCollection(
          collection.map((item) => {
            if (!item.ready) return item;
            const profile = createProceduralBrush(item.config);
            twigs.bank.current?.setBrushSound(item.id, profile);
            return {
              ...item,
              thumbnail: engine.current.setGeneratedBrush(item.id, profile),
            };
          }),
        );
      }
      if (ENABLE_SONOIZO && atelier !== "mp3") {
        if (new URLSearchParams(location.search).has("samples"))
          engine.current.setPadSource(twigs.bank.current);
        engine.current.setDroneDistance(0);
      }
    } catch (cause) {
      setSceneError(
        `La scène ne peut pas démarrer. Vérifiez WebGL : ${cause.message}`,
      );
    }
    return () => {
      brushTicket.current++;
      loadRequest.current++;
      universeRequest.current++;
      engine.current?.dispose();
      engine.current = null;
      player.current?.dispose();
      player.current = null;
    };
  }, []);

  async function enterUniverse(choice) {
    const ticket = ++universeRequest.current;
    setUniverseError("");
    const bank = twigs.bank.current;
    if (!bank) return;
    setUniverse(choice.id);
    engine.current?.reset();
    chooseBrush(ENABLE_BIRD_SONGS ? brush : choice.brushes[0]);
    chooseCamera("drone");
    setDistance(0);
    engine.current?.setDroneDistance(0);
    engine.current?.setPadSource(bank);
    try {
      await bank.preparePlayback();
      if (ticket !== universeRequest.current) return;
      if (!bank.getInstrumentStats()) await bank.startInstrument(choice.id);
      if (ticket !== universeRequest.current) {
        bank.pauseAmbience();
        return;
      }
      bank.setAtmosphere(atmosphereRef.current);
    } catch (cause) {
      if (ticket === universeRequest.current)
        setUniverseError(`Composition indisponible : ${cause.message}`);
    }
  }
  async function buildBrush(config) {
    if (brushBusy.current || !twigs.bank.current) return;
    const id = collection[0].ready
      ? BRUSHES.find(
          (item) => !collection.some((brush) => brush.id === item.id),
        )?.id
      : collection[0].id;
    if (!id) return;
    brushBusy.current = true;
    setCreatingBrush(true);
    setBrushError("");
    const ticket = ++brushTicket.current;
    try {
      const result = await twigs.bank.current.generateBirdBrush(id, config);
      if (ticket !== brushTicket.current || !engine.current) return;
      if (!result) {
        setBrushError(
          twigs.bank.current?.getSnapshot().birds.error ||
            "La brosse n’a pas pu être créée.",
        );
        return;
      }
      twigs.bank.current.setBrushSound(id, result.profile);
      const thumbnail = engine.current.setGeneratedBrush(id, result.profile);
      const item = {
        id,
        name: result.profile.name,
        config: result.profile.config,
        ready: true,
        thumbnail,
        color: result.profile.color,
        baseId: result.profile.baseId,
      };
      const next = collection.some((entry) => entry.id === id)
        ? collection.map((entry) => (entry.id === id ? item : entry))
        : [...collection, item];
      setCollection(next);
      persistPalette(next);
      chooseBrush(id);
      return true;
    } catch (cause) {
      if (ticket === brushTicket.current)
        setBrushError(`Création impossible : ${cause.message}`);
    } finally {
      if (ticket === brushTicket.current) {
        brushBusy.current = false;
        setCreatingBrush(false);
      }
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
    if (id !== "photo" && (id === "gyro" || mode === "photo"))
      void twigs.bank.current?.preparePlayback();
    if (universe && mode === "photo" && id !== "photo") {
      const ambience = twigs.bank.current?.getSnapshot().ambience;
      if (ambience?.loaded && !ambience.playing && !ambience.userPaused)
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
      {universe && mode !== "photo" && twigs.snapshot.composition?.loaded && (
        <button
          className="ambience-toggle"
          aria-label={
            twigs.snapshot.composition.playing
              ? "Mettre la composition en pause"
              : "Reprendre la composition"
          }
          aria-pressed={twigs.snapshot.composition.playing}
          onClick={() => twigs.bank.current?.toggleComposition()}
        >
          ♪
        </button>
      )}
      {universe && (universeError || twigs.error) && (
        <p className="ambience-error" role="status">
          {universeError || twigs.error}
        </p>
      )}
      {immersive &&
        !universe &&
        !new URLSearchParams(location.search).has("samples") && (
          <section
            className="universe-picker"
            aria-label="Entrer dans le paysage"
          >
            <h2>Un ciel, des matières vivantes</h2>
            <p>
              Composez vos brosses, puis laissez l’oizo en sculpter les
              couleurs, les formes et les matières.
            </p>
            <button
              className="enter-landscape"
              onClick={() => enterUniverse(UNIVERSES[0])}
            >
              Entrer dans le paysage
            </button>
            <details className="artistic-about">
              <summary>La démarche artistique</summary>
              <ArtisticIntroduction />
            </details>
          </section>
        )}
      {immersive && universe && mode !== "photo" && (
        <button
          className="universe-change"
          aria-label="Revenir à l’accueil"
          onClick={() => {
            universeRequest.current++;
            twigs.bank.current?.stopAll();
            twigs.bank.current?.pauseAmbience();
            engine.current?.setPadSource(null);
            setUniverse(null);
            setUniverseError("");
            setToolsOpen(false);
          }}
        >
          ◇
        </button>
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
        onPhotoZoom={(factor) => {
          const zoom = Number(
            stage.current.querySelector("canvas").dataset.photoZoom || 1,
          );
          engine.current?.setPhotoZoom(zoom * factor);
        }}
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
        <span>Glisser pour guider · maintenir pour tracer</span>
      </div>
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
        <GrowingBrushMenu
          brushes={collection}
          selected={brush}
          busy={creatingBrush}
          error={brushError}
          onSelect={chooseBrush}
          onAdd={buildBrush}
          onSave={() => persistPalette()}
          saveMessage={paletteMessage}
          max={BRUSHES.length}
        />
      ) : (
        <ControlPanel
          brush={brush}
          onBrush={chooseBrush}
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
