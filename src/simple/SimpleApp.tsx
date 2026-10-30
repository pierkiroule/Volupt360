import { useEffect, useRef, useState } from "react";
import { NUANCES, readPalette, SIMPLE_KEY } from "./palette";
import { SimpleWorld } from "./SimpleWorld";
import { MONUMENTAL_STUDY, STUDY_PALETTE } from "./MonumentalStudy";
import { WeatherMusic } from "./WeatherMusic";
import { requestGyroscope } from "../scene/gyroOrientation";
import "./simple.css";

export default function SimpleApp() {
  const [selected, setSelected] = useState(readPalette);
  const [inside, setInside] = useState(false);
  const [travel, setTravel] = useState(false);
  const [paused, setPaused] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [gyro, setGyro] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState(false);
  const [retry, setRetry] = useState(0);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const music = useRef<WeatherMusic | null>(null);
  const [musicState, setMusicState] = useState<
    "off" | "loading" | "on" | "paused" | "error"
  >("off");
  const [volume, setVolume] = useState(0.55);
  const musicWanted = useRef(false);
  const resumeMusic = useRef(false);
  useEffect(
    () => () => {
      musicWanted.current = false;
      music.current?.dispose();
      music.current = null;
    },
    [],
  );
  useEffect(() => {
    music.current?.setPalette(MONUMENTAL_STUDY ? STUDY_PALETTE : selected);
  }, [selected]);
  useEffect(() => {
    if (!inside || paused) {
      musicWanted.current = false;
      music.current?.pause();
      setMusicState((state) =>
        state === "on" || state === "loading" ? "paused" : state,
      );
    }
  }, [inside, paused]);
  async function toggleMusic() {
    if (musicState === "loading") return;
    if (musicState === "on") {
      musicWanted.current = false;
      music.current?.pause();
      setMusicState("paused");
      return;
    }
    await startMusic();
  }
  async function startMusic() {
    if (musicState === "loading") return;
    musicWanted.current = true;
    setMusicState("loading");
    try {
      if (!music.current || music.current.inspect().state === "closed")
        music.current = new WeatherMusic(
          MONUMENTAL_STUDY ? STUDY_PALETTE : selected,
          () => {
            musicWanted.current = false;
            if (alive.current) setMusicState("paused");
          },
        );
      music.current.setVolume(volume);
      await music.current.start();
      if (!alive.current || !musicWanted.current) {
        music.current?.pause();
        return;
      }
      setMusicState("on");
    } catch {
      if (alive.current) {
        setMusicState("error");
        setNotice("Le son n’a pas pu démarrer. Touche Musique pour réessayer.");
      }
    }
  }
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<SimpleWorld | null>(null);
  const current = useRef({ selected, inside, travel, paused });
  current.current = { selected, inside, travel, paused };
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    document.title = "ÉmoCiel •° — Compose ta météo intérieure";
    if ("serviceWorker" in navigator && import.meta.env.PROD)
      void navigator.serviceWorker
        .register(import.meta.env.BASE_URL + "sw.js")
        .catch(() => {});
    try {
      const scene = new SimpleWorld(host.current!, (message) => {
        setNotice(message);
        if (message.startsWith("Pas de signal")) setGyro(false);
      });
      scene.setPalette(current.current.selected);
      scene.setAudioSource(() => music.current?.readSignal());
      scene.inside = current.current.inside;
      scene.travel = current.current.travel;
      scene.paused = current.current.paused;
      world.current = scene;
      setFailure(false);
    } catch {
      setFailure(true);
      setNotice("Le rendu 3D n’a pas pu démarrer. Tu peux le relancer.");
    }
    return () => {
      alive.current = false;
      world.current?.dispose();
      world.current = null;
    };
  }, [retry]);
  useEffect(() => {
    world.current?.setPalette(selected);
    try {
      localStorage.setItem(SIMPLE_KEY, JSON.stringify(selected));
    } catch {
      setNotice("Tes choix restent disponibles pendant cette visite.");
    }
  }, [selected, retry]);
  useEffect(() => {
    if (!world.current) return;
    world.current.inside = inside;
    world.current.travel = travel;
    world.current.paused = paused;
  }, [inside, travel, paused, retry]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        resumeMusic.current = music.current?.inspect().running ?? false;
        setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  function choose(id: string) {
    setNotice("");
    if (selected.includes(id)) {
      if (selected.length > 1)
        setSelected(selected.filter((item) => item !== id));
      return;
    }
    if (selected.length === 3) {
      setNotice(
        "Trois nuances à la fois. Retire-en une pour en choisir une autre.",
      );
      return;
    }
    setSelected([...selected, id]);
  }
  async function toggleGyro() {
    if (gyro) {
      world.current?.setGyro(false);
      setGyro(false);
      return;
    }
    setPermissionBusy(true);
    try {
      await requestGyroscope();
      if (!alive.current || !world.current?.inside) return;
      world.current.setGyro(true);
      setGyro(true);
      setTravel(false);
      setNotice(
        "Tourne doucement ton téléphone. Le glissement reste disponible.",
      );
    } catch (error) {
      if (alive.current)
        setNotice(
          error instanceof Error
            ? error.message
            : "Glisse pour regarder autour de toi.",
        );
    } finally {
      if (alive.current) setPermissionBusy(false);
    }
  }
  return (
    <main className={"simple-app" + (inside ? " is-inside" : "")}>
      {!inside && (
        <header className="simple-heading">
          <span className="simple-overline">
            {MONUMENTAL_STUDY
              ? "Étude I — Indigo & terre"
              : "Ton ciel, à ta façon"}
          </span>
          <h1>
            ÉmoCiel <i>•°</i>
          </h1>
          <p>
            {MONUMENTAL_STUDY ? (
              <>
                Un paysage d’encre suspendu.
                <br />
                Approcher. Traverser. Regarder autrement.
              </>
            ) : (
              <>
                Compose ta météo intérieure.
                <br />
                Entre dans ton atmosphère en 360°.
              </>
            )}
          </p>
        </header>
      )}
      <div className="simple-orbit">
        <div ref={host} className="simple-world" data-inside={inside} />
        {!inside && (
          <>
            {!MONUMENTAL_STUDY && (
              <div
                className="simple-ring"
                role="group"
                aria-label="Choisir une à trois émotions"
              >
                {NUANCES.map((n, index) => (
                  <button
                    key={n.id}
                    className="simple-nuance"
                    style={
                      {
                        "--angle": `${index * (360 / NUANCES.length) - 90}deg`,
                        "--ink": n.color,
                      } as React.CSSProperties
                    }
                    aria-label={n.label}
                    title={n.label}
                    aria-pressed={selected.includes(n.id)}
                    onClick={() => choose(n.id)}
                  >
                    <span className="simple-weather-symbol" aria-hidden="true">
                      {n.emoji}
                    </span>
                    {selected.includes(n.id) && (
                      <svg
                        className="simple-selection-check"
                        viewBox="0 0 16 16"
                        aria-hidden="true"
                      >
                        <circle cx="8" cy="8" r="8" fill="currentColor" />
                        <path
                          d="m4.5 8 2.3 2.3 4.7-4.6"
                          fill="none"
                          stroke="white"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
            {!failure && (
              <button
                className="simple-enter"
                aria-label="Entrer dans mon ciel"
                onClick={() => {
                  setInside(true);
                  const reduced = matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches;
                  setTravel(!reduced);
                  setPaused(reduced);
                  resumeMusic.current = true;
                  setNotice(
                    reduced
                      ? "Mouvements réduits : Reprendre reste disponible."
                      : "",
                  );
                  if (!reduced) void startMusic();
                }}
              >
                Entrer{" "}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 10L10 2M3 2h7v7"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
      {!inside && (
        <footer className="simple-footer">
          <p>
            {MONUMENTAL_STUDY
              ? "Indigo profond, terre cuite et réserves de papier."
              : "Le premier choix donne l’élan. Les suivants transforment le monde."}
          </p>
          <small>
            Voyage et musique au toucher d’Entrer · silence disponible avec ♫
          </small>
          {!MONUMENTAL_STUDY && (
            <small className="simple-selected-names" aria-live="polite">
              {selected
                .map((id) => NUANCES.find((n) => n.id === id)?.label)
                .join(" · ")}
            </small>
          )}
        </footer>
      )}
      {inside && (
        <>
          <div className="simple-signature">
            ÉmoCiel <i>•°</i>
          </div>
          <div className="simple-guidance">
            {travel
              ? "Glisse pour orienter ta traversée. Relâche pour te laisser porter."
              : "Glisse pour regarder autour de toi."}
          </div>
          <nav className="simple-tools" aria-label="Contempler mon univers">
            <button
              aria-label={
                MONUMENTAL_STUDY
                  ? "Revenir à l’accueil"
                  : "Revenir à la palette"
              }
              onClick={() => {
                setInside(false);
                setTravel(false);
                setGyro(false);
                world.current?.setGyro(false);
                setNotice("");
              }}
            >
              ←<span>{MONUMENTAL_STUDY ? "Accueil" : "Palette"}</span>
            </button>
            <button
              aria-label={travel ? "Contempler" : "Voyager"}
              aria-pressed={travel}
              onClick={() => {
                setTravel(!travel);
                setNotice("");
              }}
            >
              ↝<span>{travel ? "Contempler" : "Voyager"}</span>
            </button>
            <button
              aria-label={paused ? "Reprendre" : "Pause"}
              aria-pressed={paused}
              onClick={() => {
                if (paused) {
                  if (world.current) world.current.paused = false;
                  setPaused(false);
                  if (resumeMusic.current) void startMusic();
                } else {
                  resumeMusic.current =
                    musicState === "on" || musicState === "loading";
                  if (world.current) world.current.paused = true;
                  musicWanted.current = false;
                  music.current?.pause();
                  setPaused(true);
                }
              }}
            >
              {paused ? "▷" : "Ⅱ"}
              <span>{paused ? "Reprendre" : "Pause"}</span>
            </button>
            <button
              aria-label="Gyroscope"
              disabled={permissionBusy}
              aria-pressed={gyro}
              onClick={() => void toggleGyro()}
            >
              ◎<span>{permissionBusy ? "…" : "Gyro"}</span>
            </button>
          </nav>
        </>
      )}
      {inside && (
        <details className="simple-music" data-state={musicState}>
          <summary aria-label="Réglages musique">♫</summary>
          <div>
            <button
              onClick={() => void toggleMusic()}
              disabled={musicState === "loading" || paused}
              aria-label={
                musicState === "on" ? "Couper la musique" : "Activer la musique"
              }
            >
              {musicState === "loading"
                ? "Chargement…"
                : musicState === "on"
                  ? "Couper le son"
                  : "Musique"}
            </button>
            <label>
              Volume
              <input
                aria-label="Volume musique"
                type="range"
                min="0"
                max=".8"
                step=".01"
                value={volume}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setVolume(value);
                  music.current?.setVolume(value);
                }}
              />
            </label>
            <small>
              Électro · 104 BPM · boucles locales, piano et cordes · CC0
            </small>
          </div>
        </details>
      )}
      {notice && (
        <p className="simple-notice" role="status">
          {notice}
        </p>
      )}
      {failure && (
        <div className="simple-failure">
          <button
            onClick={() => {
              setNotice("");
              setRetry((n) => n + 1);
            }}
          >
            Relancer la vue
          </button>
        </div>
      )}
    </main>
  );
}
