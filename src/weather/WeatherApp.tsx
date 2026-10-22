import { useCallback, useEffect, useRef, useState } from "react";
import { WeatherDisk } from "./WeatherDisk";
import { requestGyroscope } from "./WeatherWorld";
import { UnifiedWeatherWorld } from "./UnifiedWeatherWorld";
import {
  WEATHER,
  MAX_ZONES,
  readSaved,
  STORAGE_KEY,
  type Zone,
  type WeatherId,
} from "./weatherModel";
import { getLandscapeMusic, releaseLandscapeMusic } from "../landscape/StrudelMusicEngine";
import { weatherScore } from "./weatherScore";
import type { Steering } from "./navigationInput";
import "./weather.css";
export default function WeatherApp() {
  const [zones, setZones] = useState<Zone[]>(readSaved),
    [selected, setSelected] = useState<string | null>(null),
    [kind, setKind] = useState<WeatherId>("sun"),
    [size, setSize] = useState(0.27),
    [opacity, setOpacity] = useState(0.8),
    [inside, setInside] = useState(false),
    [paused, setPaused] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [travel, setTravel] = useState(false),
    [gyro, setGyro] = useState(false),
    [gyroRevision, setGyroRevision] = useState(0),
    [notice, setNotice] = useState("");
  const navigation = useRef<Steering>({ x: 0, y: 0, active: false }),
    pointer = useRef<number | null>(null),
    origin = useRef({ x: 0, y: 0 }),
    history = useRef<Zone[][]>([]),
    future = useRef<Zone[][]>([]),
    [revision, setRevision] = useState(0);
  const [sound, setSound] = useState(false), [soundBusy, setSoundBusy] = useState(false);
  const score = weatherScore(zones);
  useEffect(() => {
    if (sound) void getLandscapeMusic().update(score).catch(() => {
      setSound(false); setNotice("La musique peut être relancée avec ♪.");
    });
  }, [zones, sound]);
  useEffect(() => {
    void getLandscapeMusic().setPaused(paused || !inside).catch(() => setNotice("La musique est suspendue."));
  }, [paused, inside]);
  useEffect(() => () => { void releaseLandscapeMusic(); }, []);
  async function toggleSound() {
    if (soundBusy) return;
    setSoundBusy(true);
    try {
      if (sound) { await getLandscapeMusic().stop(); setSound(false); }
      else {
        setPaused(false);
        await getLandscapeMusic().setPaused(false);
        await getLandscapeMusic().start(score);
        setSound(true);
      }
    } catch { setNotice("Le son n’a pas démarré. Touche ♪ pour réessayer."); }
    finally { setSoundBusy(false); }
  }
  const current = useRef(zones);
  current.current = zones;
  const resetInput = useCallback(() => {
    navigation.current = { x: 0, y: 0, active: false };
    pointer.current = null;
  }, []);
  const gyroError = useCallback((text: string) => {
    setGyro(false);
    setNotice(text);
  }, []);
  useEffect(() => {
    document.title = "Mon CosmoSensoriel •°";
    if (import.meta.env.PROD && "serviceWorker" in navigator)
      navigator.serviceWorker
        .register(import.meta.env.BASE_URL + "sw.js")
        .catch(() => {});
    const hide = () => {
      if (document.hidden) {
        setPaused(true);
        resetInput();
      }
    };
    window.addEventListener("blur", resetInput);
    window.addEventListener("resize", resetInput);
    window.addEventListener("orientationchange", resetInput);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("blur", resetInput);
      window.removeEventListener("resize", resetInput);
      window.removeEventListener("orientationchange", resetInput);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [resetInput]);
  function checkpoint() {
    history.current.push(current.current.map((z) => ({ ...z })));
    if (history.current.length > 50) history.current.shift();
    future.current = [];
    setRevision((r) => r + 1);
  }
  function place(x: number, y: number) {
    if (zones.length >= MAX_ZONES) {
      setNotice(
        "Le disque accueille jusqu’à 32 zones. Tu peux déplacer ou retirer une zone.",
      );
      return;
    }
    checkpoint();
    const zone: Zone = {
      id: crypto.randomUUID(),
      kind,
      x,
      y,
      size,
      opacity,
      seed: Math.floor(Math.random() * 0xffffffff),
    };
    setZones([...zones, zone]);
    setSelected(zone.id);
  }
  function select(id: string) {
    const z = zones.find((z) => z.id === id)!;
    checkpoint();
    setSelected(id);
    setKind(z.kind);
    setSize(z.size);
    setOpacity(z.opacity);
  }
  function change(property: "size" | "opacity", value: number) {
    if (property === "size") setSize(value);
    else setOpacity(value);
    if (selected)
      setZones(
        zones.map((z) => (z.id === selected ? { ...z, [property]: value } : z)),
      );
  }
  function undo(redo = false) {
    const from = redo ? future.current : history.current,
      to = redo ? history.current : future.current;
    const value = from.pop();
    if (!value) return;
    to.push(zones);
    setZones(value);
    setSelected(null);
    setRevision((r) => r + 1);
  }
  void revision;
  return (
    <main
      className={"meteo " + (inside ? "meteo-immersed" : "")}
      data-zones={zones.length}
    >
      {!inside && (
        <header>
          <p className="meteo-kicker">
            Un cosmos à ressentir, sans rien à expliquer
          </p>
          <h1>
            Mon CosmoSensoriel <span>•°</span>
          </h1>
          <p>Compose les nuances de tes sensations. Entre dans leur imaginaire.</p>
        </header>
      )}
      <section
        className="meteo-stage"
        aria-label={
          inside ? "Mon cosmos sensoriel en trois dimensions" : "Composition de mon ciel"
        }
      >
        {inside ? (
          <div
            className="meteo-flight"
            onPointerDown={(e) => {
              if (!e.isPrimary || paused || pointer.current !== null) return;
              pointer.current = e.pointerId;
              origin.current = { x: e.clientX, y: e.clientY };
              navigation.current = { x:0, y:0, active:true, mode:travel ? "steer" : "drag", lastGestureAt:performance.now() };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (pointer.current !== e.pointerId) return;
              if (navigation.current.mode === "drag") {
                navigation.current.x += (e.clientX-origin.current.x)/Math.max(180,e.currentTarget.clientWidth)*2.8;
                navigation.current.y += (e.clientY-origin.current.y)/Math.max(180,e.currentTarget.clientHeight)*2.8;
                origin.current = {x:e.clientX,y:e.clientY};
              } else {
                navigation.current.x = Math.max(-1,Math.min(1,(e.clientX-origin.current.x)/90));
                navigation.current.y = Math.max(-1,Math.min(1,(e.clientY-origin.current.y)/90));
              }
              navigation.current.lastGestureAt = performance.now();
            }}
            onPointerUp={(e) => {
              if (pointer.current === e.pointerId) resetInput();
            }}
            onPointerCancel={(e) => {
              if (pointer.current === e.pointerId) resetInput();
            }}
            onLostPointerCapture={(e) => {
              if (pointer.current === e.pointerId) resetInput();
            }}
          >
            <UnifiedWeatherWorld
              zones={zones}
              paused={paused}
              travel={travel}
              gyro={gyro}
              gyroRevision={gyroRevision}
              navigation={navigation}
              onGyroError={gyroError}
            />
          </div>
        ) : (
          <WeatherDisk
            zones={zones}
            selected={selected}
            kind={kind}
            paused={paused}
            onPlace={place}
            onSelect={select}
            onMove={(id, x, y) =>
              setZones(
                current.current.map((z) => (z.id === id ? { ...z, x, y } : z)),
              )
            }
          />
        )}
        {!inside && (
          <div className="meteo-palette meteo-ring" aria-label="Palette sensorielle autour du disque">
            {WEATHER.map((w, i) => (
              <button
                key={w.id}
                style={{ left: `${50 + 59 * Math.sin(i / WEATHER.length * Math.PI * 2)}%`, top: `${50 - 59 * Math.cos(i / WEATHER.length * Math.PI * 2)}%` }}
                title={w.label}
                aria-label={w.label}
                aria-pressed={kind === w.id}
                onClick={() => {
                  setKind(w.id);
                  setSelected(null);
                }}
              >
                {w.emoji}
              </button>
            ))}
          </div>
        )}
        {!inside && zones.length === 0 && (
          <p className="meteo-empty">
            Chaleur, souffle, légèreté…
            <br />
            Choisis une sensation, puis touche le disque.
          </p>
        )}
      </section>
      {!inside ? (
        <section className="meteo-tools" aria-label="Composer mon univers sensoriel">
          <div className="meteo-sliders">
            <label>
              Proportion <output>{Math.round(size * 100)} %</output>
              <input
                aria-label="Proportion"
                type="range"
                min=".10"
                max=".5"
                step=".01"
                value={size}
                onPointerDown={checkpoint}
                onKeyDown={(e) => {
                  if (!e.repeat) checkpoint();
                }}
                onChange={(e) => change("size", +e.target.value)}
              />
            </label>
            <label>
              Opacité <output>{Math.round(opacity * 100)} %</output>
              <input
                aria-label="Opacité"
                type="range"
                min=".1"
                max="1"
                step=".01"
                value={opacity}
                onPointerDown={checkpoint}
                onKeyDown={(e) => {
                  if (!e.repeat) checkpoint();
                }}
                onChange={(e) => change("opacity", +e.target.value)}
              />
            </label>
          </div>
          <div className="meteo-actions">
            <button
              aria-label="Annuler"
              disabled={!history.current.length}
              onClick={() => undo()}
            >
              ↶
            </button>
            <button
              aria-label="Rétablir"
              disabled={!future.current.length}
              onClick={() => undo(true)}
            >
              ↷
            </button>
            <button
              disabled={!selected}
              onClick={() => {
                checkpoint();
                setZones(zones.filter((z) => z.id !== selected));
                setSelected(null);
              }}
            >
              Retirer
            </button>
            <button
              className="meteo-primary"
              disabled={!zones.length}
              onClick={() => {
                setInside(true);
                setPaused(false);
                setTravel(true);
                resetInput();
              }}
            >
              Entrer dans mon cosmos ↗
            </button>
          </div>
          <div className="meteo-secondary">
            <button aria-pressed={!paused} onClick={() => setPaused(!paused)}>
              {paused ? "Animer" : "Figer"}
            </button>
            <button
              disabled={!zones.length}
              onClick={() => {
                try {
                  localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify({ version: 1, zones }),
                  );
                  setNotice(
                    "Ton ciel est enregistré sur cet appareil uniquement.",
                  );
                } catch {
                  setNotice("Enregistrement indisponible sur cet appareil.");
                }
              }}
            >
              Enregistrer
            </button>
          </div>
          <p className="meteo-help">
            Touche le centre d’une zone pour la déplacer ou l’ajuster.
          </p>
        </section>
      ) : (
        <>
          <div className="meteo-flight-name">
            Mon CosmoSensoriel <span>•°</span>
          </div>
          <p className="meteo-flight-hint">
            {travel
              ? "Glisse pour explorer ton cosmos, ou laisse-toi porter."
              : "Glisse pour regarder autour de toi."}
          </p>
          <button className="meteo-sound" disabled={soundBusy} aria-label={sound ? "Couper la musique" : "Écouter mon paysage"} aria-pressed={sound} onClick={() => void toggleSound()}>{soundBusy ? "…" : sound ? "♪ Son" : "♪ Écouter"}</button>
          <a className="meteo-music-credit" href={import.meta.env.BASE_URL + "licenses/strudel.txt"} target="_blank" rel="noreferrer">Strudel · licence et sources</a>
          <nav
            className="meteo-flight-controls"
            aria-label="Contempler mon ciel"
          >
            <button
              onClick={() => {
                setInside(false);
                setGyro(false);
                resetInput();
              }}
            >
              ← Disque
            </button>
            <button
              aria-pressed={travel}
              onClick={() => {
                resetInput();
                setTravel(!travel);
                setPaused(false);
              }}
            >
              {travel ? "Contempler" : "Voyager"}
            </button>
            <button
              aria-pressed={gyro}
              onClick={async () => {
                if (gyro) {
                  setGyro(false);
                  return;
                }
                resetInput();
                setTravel(false);
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
            {gyro && <button aria-label="Recentrer l’horizon" title="Recentrer l’horizon" disabled={paused} onClick={()=>{resetInput();setGyroRevision(n=>n+1);}}>⟲</button>}
            <button onClick={() => setPaused(!paused)}>
              {paused ? "Reprendre" : "Pause"}
            </button>
          </nav>
        </>
      )}
      {notice && (
        <button
          className="meteo-notice"
          role="status"
          onClick={() => setNotice("")}
        >
          {notice}
        </button>
      )}
    </main>
  );
}
