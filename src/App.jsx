import EchoMoodPicker from "./components/EchoMoodPicker.jsx";
import { echoMoodEngine } from "./echoMood/echoMoodEngine.js";
import { universeGenerator } from "./echoMood/universeGenerator.js";
import { brushFactory } from "./echoMood/brushFactory.js";
import { musicSelector } from "./echoMood/musicSelector.js";
import musicCatalog from "virtual:echo-music";
import BrushEditor from "./components/BrushEditor.jsx";
import LandscapeBrushMenu from "./components/LandscapeBrushMenu.jsx";
import { LANDSCAPE_BRUSHES } from "./materials/landscapePalette.js";
import { ENABLE_BIRD_SONGS } from "./sonoizo/instrumentConfig.js";
import ArtisticIntroduction from "./components/ArtisticIntroduction.jsx";
import { UNIVERSES } from "./sonoizo/universes.js";
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
  const [bubbleScore, setBubbleScore] = useState(0);
  const classic = new URLSearchParams(location.search).has("classic");
  const [universe, setUniverse] = useState(null);
  const [echoMood, setEchoMood] = useState(null),
    [blooming, setBlooming] = useState(false);
  const moodSeed = useRef(0);
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
  const [brushes, setBrushes] = useState(LANDSCAPE_BRUSHES);
  const [editingBrush, setEditingBrush] = useState(null);
  const previousView = useRef("drone");
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
      ? "OIZO •° — ÉchoMood"
      : "NID SONORE•° — Paysages d’aquarelle";
    try {
      engine.current = createSoundNest(stage.current, {
        onHint: setHint,
        onError: setSceneError,
        onBubbleScore: setBubbleScore,
      });
      if (classic || new URLSearchParams(location.search).has("samples"))
        for (const profile of LANDSCAPE_BRUSHES)
          engine.current.setGeneratedBrush(profile.id, profile);
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
    engine.current?.setDroneDistance(0);
    engine.current?.setPadSource(bank);
    await bank.preparePlayback();
    if (ticket !== universeRequest.current) return;
    const ambience = bank.getSnapshot().ambience;
    if (ambience.loaded && !ambience.playing && !ambience.userPaused)
      await bank.toggleAmbience();
  }
  async function bloomMood(emojis) {
    const ticket = ++universeRequest.current;
    setBlooming(true);
    setUniverseError("");
    twigs.clearError();
    try {
      const mood = echoMoodEngine(emojis, moodSeed.current++),
        profiles = brushFactory(mood);
      const bank = twigs.bank.current;
      await bank.preparePlayback();
      if (ticket !== universeRequest.current) return;
      engine.current.setMood(universeGenerator(mood), profiles);
      engine.current.setPadSource(bank);
      setEchoMood(mood);
      setBrushes(profiles);
      chooseBrush(profiles[0].id);
      chooseCamera("sculpt");
      setUniverse("echo-mood");
      const selected = musicSelector(mood, musicCatalog);
      if (selected) {
        const loaded = await bank.loadMoodAmbience(
          `${import.meta.env.BASE_URL}${selected}`,
        );
        if (ticket === universeRequest.current && loaded)
          await bank.toggleAmbience();
      } else bank.removeAmbience();
    } catch (cause) {
      setUniverseError(cause.message);
    } finally {
      if (ticket === universeRequest.current) setBlooming(false);
    }
  }
  function toggleGlobal() {
    if (mode === "global") chooseCamera(previousView.current);
    else {
      previousView.current =
        mode === "gyro" ? "gyro" : mode === "sculpt" ? "sculpt" : "drone";
      chooseCamera("global");
    }
  }
  async function applyBrush(profile, options) {
    const updated = await engine.current.updateBrush(profile, options);
    if (updated)
      setBrushes((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      );
  }
  async function importMusic(file) {
    if (!file) return;
    twigs.clearError();
    setUniverseError("");
    setLoading(true);
    try {
      const bank = twigs.bank.current;
      await bank.preparePlayback();
      const loaded = await bank.importAmbience(file);
      if (loaded) await bank.toggleAmbience();
    } catch (cause) {
      setUniverseError(`Lecture indisponible : ${cause.message}`);
    } finally {
      setLoading(false);
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
      {immersive && universe && mode !== "photo" && (
        <div className="music-import">
          <label
            title={
              twigs.snapshot.ambience?.name ||
              "Votre musique reste sur cet appareil"
            }
          >
            {loading
              ? "Chargement…"
              : twigs.snapshot.ambience?.loaded
                ? "Changer le MP3"
                : "Importer un MP3"}
            <input
              type="file"
              accept="audio/mpeg,audio/mp3,.mp3"
              aria-label="Importer un MP3"
              disabled={loading}
              onChange={(event) => {
                void importMusic(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      )}
      {immersive && universe && mode !== "photo" && (
        <button
          className="instant-photo"
          aria-label="Photographier la vue actuelle"
          title="Instantané PNG HD"
          onClick={exportPhoto}
          disabled={photoBusy || videoBusy}
        >
          {photoBusy ? "…" : "◎"}
        </button>
      )}
      {mode !== "photo" && videoError && (
        <p className="ambience-error" role="alert">
          {videoError}
        </p>
      )}
      {universe && mode !== "photo" && twigs.snapshot.ambience?.loaded && (
        <button
          className="ambience-toggle"
          aria-label={
            twigs.snapshot.ambience.playing
              ? "Mettre l’ambiance en pause"
              : "Reprendre l’ambiance musicale"
          }
          aria-pressed={twigs.snapshot.ambience.playing}
          onClick={() => twigs.bank.current?.toggleAmbience()}
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
        !new URLSearchParams(location.search).has("samples") &&
        (classic ? (
          <section
            className="universe-picker"
            aria-label="Entrer dans le paysage"
          >
            <h2>Le papier devient espace</h2>
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
        ) : (
          <EchoMoodPicker onBloom={bloomMood} busy={blooming} />
        ))}
      {immersive && universe && mode !== "photo" && (
        <button
          className="universe-change"
          aria-label="Changer d’ÉchoMood"
          onClick={() => {
            universeRequest.current++;
            setBlooming(false);
            twigs.bank.current?.cancelAmbienceLoad();
            twigs.bank.current?.stopAll();
            twigs.bank.current?.fadeAmbience();
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
      {immersive && universe && (
        <>
          <output
            className="bubble-score"
            aria-label="Bulles écoutées"
            aria-live="polite"
          >
            Bulles écoutées · {bubbleScore}/24
          </output>
          <div className="mood-badge" aria-label="ÉchoMood choisi">
            {echoMood?.emojis.join(" ")}
          </div>
          <button
            className="sculpt-mode"
            aria-label="Sculpter au geste"
            aria-pressed={mode === "sculpt"}
            onClick={() => chooseCamera("sculpt")}
          >
            ⌁
          </button>
          {twigs.snapshot.ambience?.loaded && (
            <label className="mood-volume">
              Volume
              <input
                aria-label="Volume musical"
                type="range"
                min="0"
                max="1"
                step=".01"
                value={twigs.snapshot.ambience.volume ?? 0.45}
                onChange={(event) =>
                  twigs.bank.current.setAmbienceVolume(event.target.value)
                }
              />
            </label>
          )}
        </>
      )}
      <CameraViews
        disabled={videoBusy || photoBusy}
        compact={immersive}
        expanded={!immersive || toolsOpen}
        mode={mode}
        onChange={chooseCamera}
        onToggleGlobal={toggleGlobal}
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
        <LandscapeBrushMenu
          brushes={brushes}
          selected={brush}
          onSelect={chooseBrush}
          onEdit={setEditingBrush}
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
      {editingBrush && (
        <BrushEditor
          key={editingBrush.id}
          brush={editingBrush}
          onApply={applyBrush}
          onClose={() => setEditingBrush(null)}
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
