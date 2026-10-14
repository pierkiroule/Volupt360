import ArtisticIntroduction from "./components/ArtisticIntroduction.jsx";
import { ENABLE_ECHO_INSTRUMENT } from "./sonoizo/instrumentConfig.js";
import { AtmosphereSpheres } from "./components/AtmosphereSpheres.jsx";
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
  const [universe, setUniverse] = useState(null);
  const [atmosphereMix, setAtmosphereMix] = useState([1, 0, 0]);
  const [atmosphere, setAtmosphere] = useState({ echo: 0.5, hypnos: 0.3 });
  const atmosphereRef = useRef({ echo: 0.5, hypnos: 0.3 });
  const atmosphereMixRef = useRef([1, 0, 0]);
  const atmosphereStart = useRef(null);
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
      ? "ÉCHO & HYPNOS •° — Trois univers ambient génératifs"
      : "NID SONORE•° — Paysages d’aquarelle";
    try {
      engine.current = createSoundNest(stage.current, {
        onBrushChange: setBrush,
        onHint: setHint,
        onError: setSceneError,
      });
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
    void bank.preparePlayback();
    setUniverse(choice.id);
    engine.current?.reset();
    chooseBrush(choice.brushes[0]);
    engine.current?.setCelestialBrushes(choice.brushes);
    chooseCamera("drone");
    setDistance(0);
    engine.current?.setDroneDistance(0);
    engine.current?.setPadSource(bank);
    if (ENABLE_ECHO_INSTRUMENT) {
      await bank.preparePlayback();
      if (ticket === universeRequest.current) {
        try {
          if (atmosphereStart.current) await atmosphereStart.current;
          if (!bank.getInstrumentStats()) await bank.startInstrument(choice.id);
          bank.setInstrumentMix(atmosphereMixRef.current);
          bank.setAtmosphere(atmosphereRef.current);
        } catch (error) {
          if (ticket === universeRequest.current)
            setUniverseError(`Synthèse aquatique : ${error.message}`);
        }
      }
      return;
    }
    const loaded = await bank.loadUniverseAmbience(
      `${import.meta.env.BASE_URL}${choice.ambience}`,
    );
    if (ticket !== universeRequest.current) return;
    if (loaded) await bank.toggleAmbience();
    else
      setUniverseError(
        "L’ambiance de cet univers est indisponible : ambiance01.mp3 manque ou ne peut pas être lu.",
      );
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
            <p>
              Une expérimentation artistique du son, du geste et de leurs
              résonances.
            </p>
            <AtmosphereSpheres
              value={atmosphereMix}
              echo={atmosphere.echo}
              hypnos={atmosphere.hypnos}
              onMix={(values) => {
                setAtmosphereMix(values);
                atmosphereMixRef.current = values;
                const bank = twigs.bank.current;
                if (!bank) return;
                if (!ENABLE_ECHO_INSTRUMENT) return;
                void bank.preparePlayback();
                if (!bank.getInstrumentStats() && !atmosphereStart.current) {
                  atmosphereStart.current = bank
                    .startInstrument(
                      UNIVERSES[values.indexOf(Math.max(...values))].id,
                    )
                    .then(() => {
                      bank.setInstrumentMix(atmosphereMixRef.current);
                      bank.setAtmosphere(atmosphereRef.current);
                    })
                    .catch((error) => setUniverseError(error.message))
                    .finally(() => {
                      atmosphereStart.current = null;
                    });
                } else bank.setInstrumentMix(values);
              }}
              onAtmosphere={(values) => {
                setAtmosphere(values);
                atmosphereRef.current = values;
                twigs.bank.current?.setAtmosphere(values);
              }}
              onEnter={async () => {
                if (atmosphereStart.current) await atmosphereStart.current;
                await enterUniverse(
                  UNIVERSES[
                    atmosphereMixRef.current.indexOf(
                      Math.max(...atmosphereMixRef.current),
                    )
                  ],
                );
              }}
            />
            <ArtisticIntroduction />
          </section>
        )}
      {immersive && universe && mode !== "photo" && (
        <button
          className="universe-change"
          aria-label="Changer d’univers"
          onClick={() => {
            universeRequest.current++;
            twigs.bank.current?.stopAll();
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
        <p className="celestial-instruction" role="status">
          {BRUSHES.find((item) => item.id === brush)?.name} · Traversez les
          astres pour changer de matière
        </p>
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
