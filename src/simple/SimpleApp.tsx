import { useEffect, useRef, useState } from "react";
import { NUANCES, readPalette, SIMPLE_KEY } from "./palette";
import { SimpleWorld } from "./SimpleWorld";
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
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<SimpleWorld | null>(null);
  const current = useRef({ selected, inside, travel, paused });
  current.current = { selected, inside, travel, paused };
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    document.title = "ÉmoCiel •° — Compose ton ciel émotionnel";
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
      if (document.hidden) setPaused(true);
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
          <span className="simple-overline">Ton ciel, à ta façon</span>
          <h1>
            ÉmoCiel <i>•°</i>
          </h1>
          <p>
            Compose ton ciel émotionnel.
            <br />
            Traverse-le tranquillement en 360°.
          </p>
        </header>
      )}
      <div className="simple-orbit">
        <div ref={host} className="simple-world" data-inside={inside} />
        {!inside && (
          <>
            <div
              className="simple-ring"
              role="group"
              aria-label="Choisir une à trois nuances"
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
                  aria-pressed={selected.includes(n.id)}
                  onClick={() => choose(n.id)}
                >
                  <span>{n.emoji}</span>
                </button>
              ))}
            </div>
            {!failure && (
              <button
                className="simple-enter"
                aria-label="Entrer dans mon ciel"
                onClick={() => {
                  setInside(true);
                  setTravel(false);
                  setNotice("");
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
          <p>Choisis une à trois émotions. Puis entre.</p>
          <small>Des couleurs à explorer, sans interprétation.</small>
        </footer>
      )}
      {inside && (
        <>
          <div className="simple-signature">
            ÉmoCiel <i>•°</i>
          </div>
          <div className="simple-guidance">
            {travel
              ? "Le voyage reste au cœur de ton monde."
              : "Glisse pour regarder autour de toi."}
          </div>
          <nav className="simple-tools" aria-label="Contempler mon univers">
            <button
              aria-label="Revenir à la palette"
              onClick={() => {
                setInside(false);
                setTravel(false);
                setGyro(false);
                world.current?.setGyro(false);
                setNotice("");
              }}
            >
              ←<span>Palette</span>
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
              onClick={() => setPaused(!paused)}
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
