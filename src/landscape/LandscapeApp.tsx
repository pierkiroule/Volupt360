import { useCallback, useEffect, useRef, useState } from "react";
import { composeLandscape, type ComposedLandscape } from "./LandscapeComposer";
import { LandscapeScene, requestGyroscope } from "./LandscapeScene";
import {
  BIOMES,
  ATMOSPHERES,
  DEFAULT_SETTINGS,
  validSettings,
  type LandscapeSettings,
  type Biome,
  type Atmosphere,
} from "./types";
import { TerrainGenerator } from "./TerrainGenerator";
import "./landscape.css";
const KEY = "landscape-composer.saved.v1";
function saved() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "null");
    return validSettings(value) ? value : null;
  } catch {
    return null;
  }
}
export default function LandscapeApp() {
  const [draft, setDraft] = useState<LandscapeSettings>(DEFAULT_SETTINGS),
    [world, setWorld] = useState<ComposedLandscape | null>(null),
    [busy, setBusy] = useState(false),
    [panel, setPanel] = useState(true),
    [exploring, setExploring] = useState(false),
    [paused, setPaused] = useState(false),
    [gyro, setGyro] = useState(false),
    [notice, setNotice] = useState(""),
    [stored, setStored] = useState(saved);
  const worker = useRef<Worker | null>(null);
  const steering = useRef({ x: 0, y: 0, active: false }),
    pointer = useRef<number | null>(null),
    origin = useRef({ x: 0, y: 0 }),
    generation = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const release = useCallback(() => {
      pointer.current = null;
      steering.current = { x: 0, y: 0, active: false };
    }, []),
    gyroError = useCallback((message: string) => {
      setGyro(false);
      setNotice(message);
    }, []);
  useEffect(() => {
    document.title = "Paysages •° — Des lieux à faire apparaître";
    if (import.meta.env.PROD && "serviceWorker" in navigator)
      navigator.serviceWorker
        .register(import.meta.env.BASE_URL + "sw.js")
        .catch(() => {});
    const hide = () => {
      if (document.hidden) {
        setPaused(true);
        release();
      }
    };
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", hide);
    return () => {
      generation.current++;
      worker.current?.terminate();
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [release]);
  function generate(reuse?: LandscapeSettings) {
    if (busy) return;
    setBusy(true);
    release();
    setGyro(false);
    setExploring(false);
    setPaused(false);
    setNotice("");
    const settings = reuse || {
      ...draft,
      assetIds: undefined,
      seed: crypto.getRandomValues(new Uint32Array(1))[0],
    };
    const token = ++generation.current;
    // Yield to the browser so the button acknowledges the action before composition.
    const finish = (next: ComposedLandscape) => {
      if (token !== generation.current) return;
      setDraft(settings);
      setWorld(next);
      setPanel(false);
      setBusy(false);
      worker.current?.terminate();
      worker.current = null;
    };
    const fallback = () => {
      timer.current = setTimeout(() => {
        try {
          finish(composeLandscape(settings));
        } catch {
          setNotice("La composition n’a pas pu être créée.");
          setBusy(false);
        }
      }, 40);
    };
    if (typeof Worker === "undefined") {
      fallback();
      return;
    }
    try {
      worker.current = new Worker(
        new URL("./landscape.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.current.onmessage = (event) => {
        if (event.data.error) {
          setNotice(event.data.error);
          setBusy(false);
          worker.current?.terminate();
          return;
        }
        finish({ ...event.data, terrain: new TerrainGenerator(settings) });
      };
      worker.current.onerror = () => {
        worker.current?.terminate();
        worker.current = null;
        fallback();
      };
      worker.current.postMessage(settings);
    } catch {
      fallback();
    }
  }
  return (
    <main className={"landscape-app " + (world ? "has-world" : "")}>
      {world && (
        <div
          className="landscape-view"
          onPointerDown={(e) => {
            if (
              !exploring ||
              paused ||
              pointer.current !== null ||
              !e.isPrimary
            )
              return;
            pointer.current = e.pointerId;
            origin.current = { x: e.clientX, y: e.clientY };
            steering.current.active = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (pointer.current !== e.pointerId) return;
            steering.current.x = Math.max(
              -1,
              Math.min(1, (e.clientX - origin.current.x) / 100),
            );
            steering.current.y = Math.max(
              -1,
              Math.min(1, (e.clientY - origin.current.y) / 100),
            );
          }}
          onPointerUp={(e) => {
            if (pointer.current === e.pointerId) release();
          }}
          onPointerCancel={(e) => {
            if (pointer.current === e.pointerId) release();
          }}
          onLostPointerCapture={(e) => {
            if (pointer.current === e.pointerId) release();
          }}
        >
          <LandscapeScene
            world={world}
            exploring={exploring}
            paused={paused}
            gyro={gyro}
            steering={steering}
            onGyroError={gyroError}
          />
        </div>
      )}
      {!world && (
        <header>
          <p className="landscape-eyebrow">Le hasard compose. Tu explores.</p>
          <h1>
            Paysages <span>•°</span>
          </h1>
          <p>
            Un relief, des lumières, des chemins possibles.
            <br />
            Fais apparaître un lieu où laisser voyager ton regard.
          </p>
          <div className="landscape-cover" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </header>
      )}
      {world && (
        <div className="landscape-title">
          {BIOMES[world.settings.biome]} <span>•°</span>
          <small>
            {ATMOSPHERES[world.settings.atmosphere]} · {world.settings.seed}
          </small>
        </div>
      )}
      {(panel || !world) && (
        <section className="landscape-panel" aria-label="Composer un paysage">
          <div className="landscape-setting">
            <label htmlFor="biome">Biome</label>
            <select
              id="biome"
              value={draft.biome}
              onChange={(e) =>
                setDraft({ ...draft, biome: e.target.value as Biome })
              }
            >
              {Object.entries(BIOMES).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <label className="landscape-slider">
            Densité{" "}
            <span>
              {draft.density < 0.35
                ? "Épuré"
                : draft.density > 0.7
                  ? "Luxuriant"
                  : "Équilibré"}
            </span>
            <input
              aria-label="Densité"
              type="range"
              min="0"
              max="1"
              step=".05"
              value={draft.density}
              onChange={(e) => setDraft({ ...draft, density: +e.target.value })}
            />
          </label>
          <label className="landscape-slider">
            Relief{" "}
            <span>
              {draft.relief < 0.35
                ? "Doux"
                : draft.relief > 0.7
                  ? "Spectaculaire"
                  : "Vallonné"}
            </span>
            <input
              aria-label="Relief"
              type="range"
              min="0"
              max="1"
              step=".05"
              value={draft.relief}
              onChange={(e) => setDraft({ ...draft, relief: +e.target.value })}
            />
          </label>
          <div className="landscape-setting">
            <label htmlFor="atmosphere">Atmosphère</label>
            <select
              id="atmosphere"
              value={draft.atmosphere}
              onChange={(e) =>
                setDraft({ ...draft, atmosphere: e.target.value as Atmosphere })
              }
            >
              {Object.entries(ATMOSPHERES).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            className="landscape-primary"
            disabled={busy}
            onClick={() => generate()}
          >
            {busy
              ? "Le paysage prend forme…"
              : world
                ? "Régénérer"
                : "Générer un paysage"}
          </button>
          {!world && stored && (
            <button className="landscape-text" onClick={() => generate(stored)}>
              Retrouver mon paysage enregistré
            </button>
          )}
          {world && (
            <button className="landscape-text" onClick={() => setPanel(false)}>
              Refermer les réglages
            </button>
          )}
        </section>
      )}
      {world && (
        <>
          <p className="landscape-hint">
            {exploring
              ? "Glisse pour orienter le vol. Le voyage reste proche du paysage."
              : "Fais pivoter le paysage avec le doigt."}
          </p>
          <nav className="landscape-tools" aria-label="Explorer le paysage">
            <button aria-expanded={panel} onClick={() => setPanel(!panel)}>
              Réglages
            </button>
            <button
              aria-pressed={exploring}
              onClick={() => {
                release();
                setExploring(!exploring);
                setPaused(false);
                setGyro(false);
              }}
            >
              {exploring ? "Contempler" : "Explorer"}
            </button>
            {exploring && (
              <>
                <button
                  aria-pressed={gyro}
                  onClick={async () => {
                    if (gyro) {
                      setGyro(false);
                      return;
                    }
                    try {
                      await requestGyroscope();
                      setGyro(true);
                    } catch (e) {
                      gyroError((e as Error).message);
                    }
                  }}
                >
                  360°
                </button>
                <button onClick={() => setPaused(!paused)}>
                  {paused ? "Reprendre" : "Pause"}
                </button>
              </>
            )}
            <button
              onClick={() => {
                try {
                  localStorage.setItem(
                    KEY,
                    JSON.stringify({
                      ...world.settings,
                      assetIds: {
                        model: null,
                        environment: null,
                      },
                    }),
                  );
                  setStored({
                    ...world.settings,
                    assetIds: {
                      model: null,
                      environment: null,
                    },
                  });
                  setNotice(
                    "Paysage enregistré sur cet appareil. La graine permet de le retrouver.",
                  );
                } catch {
                  setNotice("Enregistrement indisponible sur cet appareil.");
                }
              }}
            >
              Enregistrer
            </button>
          </nav>
          <p className="landscape-source">Matières procédurales · création locale</p>
        </>
      )}
      {!world && (
        <footer>
          <a href="?meteo">Retrouver ma météo aquarellée</a>
          <span>Création locale · sans compte</span>
        </footer>
      )}
      {notice && (
        <button
          className="landscape-notice"
          role="status"
          onClick={() => setNotice("")}
        >
          {notice}
        </button>
      )}
    </main>
  );
}
