import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ColibriWorld, type FlightInput } from "./ColibriWorld";
import { INGREDIENTS, RESOURCES, kindLabel, type Resource } from "./resources";
import { requestGyroscope, deviceQuaternion } from "../scene/gyroOrientation";
import { AudioEngine } from "../studio/AudioEngine";
import "./colibri.css";
const KEY = "squibble.nectar.v1";
function readNectar(): string[] {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(data)
      ? data
          .filter((id: unknown) => RESOURCES.some((r) => r.id === id))
          .slice(0, 30)
      : [];
  } catch {
    return [];
  }
}
export default function ColibriApp() {
  const [choices, setChoices] = useState<string[]>([]),
    [inside, setInside] = useState(false),
    [paused, setPaused] = useState(false),
    [resource, setResource] = useState<Resource | null>(null),
    [visited, setVisited] = useState<Set<string>>(new Set()),
    [nectar, setNectar] = useState(readNectar),
    [notebook, setNotebook] = useState(false),
    [sound, setSound] = useState(false),
    [gyro, setGyro] = useState(false),
    [message, setMessage] = useState("");
  const input = useRef<FlightInput>({ x: 0, y: 0, active: false, gyro: null }),
    origin = useRef({ x: 0, y: 0 }),
    audio = useRef<AudioEngine | null>(null),
    dialog = useRef<HTMLDivElement>(null),
    lastFocus = useRef<HTMLElement | null>(null);
  const modal = !!resource || notebook;
  useEffect(() => {
    document.title = "Squibble le colibris •°";
    if (import.meta.env.PROD && "serviceWorker" in navigator)
      navigator.serviceWorker
        .register(import.meta.env.BASE_URL + "sw.js")
        .catch(() => {});
    return () => {
      audio.current?.dispose();
    };
  }, []);
  useEffect(() => {
    if (!gyro) {
      input.current.gyro = null;
      return;
    }
    let received = false;
    const timeout = setTimeout(() => {
      if (!received) {
        setGyro(false);
        setMessage(
          "Aucun signal reçu. Le glissement tactile reste disponible.",
        );
      }
    }, 4000);
    const handler = (e: DeviceOrientationEvent) => {
      if (e.alpha === null || e.beta === null || e.gamma === null) return;
      received = true;
      input.current.gyro = deviceQuaternion(
        e.alpha,
        e.beta,
        e.gamma,
        screen.orientation?.angle || 0,
        input.current.gyro || new THREE.Quaternion(),
      );
    };
    window.addEventListener("deviceorientation", handler);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("deviceorientation", handler);
    };
  }, [gyro]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        setPaused(true);
        input.current.active = false;
        audio.current?.setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  useEffect(() => {
    audio.current?.setPaused(paused || modal);
    if (!modal) return;
    lastFocus.current = document.activeElement as HTMLElement;
    const frame = requestAnimationFrame(() =>
      dialog.current?.querySelector<HTMLButtonElement>("button")?.focus(),
    );
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setResource(null);
        setNotebook(false);
      }
      if (e.key === "Tab") {
        const nodes = dialog.current?.querySelectorAll<HTMLElement>("button,a");
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", key);
      lastFocus.current?.focus();
    };
  }, [modal, paused]);
  function encounter(r: Resource) {
    setResource(r);
    setVisited((previous) => new Set([...previous, r.id]));
    audio.current?.gesture("light", 0.5, 0.5, 0.35);
    input.current.active = false;
  }
  function store(ids: string[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
      setNectar(ids);
      setMessage("");
    } catch {
      setMessage("Le carnet ne peut pas être enregistré sur cet appareil.");
    }
  }
  function select(emoji: string) {
    if (choices.includes(emoji)) {
      setChoices(choices.filter((c) => c !== emoji));
      return;
    }
    if (choices.length === 3) {
      setMessage("Trois ingrédients suffisent pour faire éclore un monde.");
      return;
    }
    setMessage("");
    setChoices([...choices, emoji]);
    setVisited(new Set());
  }
  return (
    <main className={"colibri " + (inside ? "in-flight" : "at-source")}>
      <div className="colibri-wash" />
      <section
        className="colibri-shell"
        aria-hidden={modal || undefined}
        inert={modal || undefined}
      >
        {!inside && (
          <header>
            <p className="colibri-eyebrow">Un imaginaire à butiner</p>
            <h1>
              Squibble<span>le colibris •°</span>
            </h1>
            <p className="colibri-intro">
              Il existe des mondes qui tiennent dans une goutte.
              <br />
              Et des voyages qui commencent par une nuance.
            </p>
          </header>
        )}
        <div className="colibri-disc-wrap">
          <div
            className="colibri-world"
            onPointerDown={(e) => {
              if (!inside || modal) return;
              origin.current = { x: e.clientX, y: e.clientY };
              input.current.active = true;
              input.current.x = input.current.y = 0;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!input.current.active) return;
              input.current.x = THREE.MathUtils.clamp(
                (e.clientX - origin.current.x) / 90,
                -1,
                1,
              );
              input.current.y = THREE.MathUtils.clamp(
                (e.clientY - origin.current.y) / 90,
                -1,
                1,
              );
            }}
            onPointerUp={() => {
              input.current.active = false;
            }}
            onPointerCancel={() => {
              input.current.active = false;
            }}
          >
            <ColibriWorld
              choices={choices}
              inside={inside}
              paused={paused || modal}
              visited={visited}
              input={input}
              onEncounter={encounter}
            />
          </div>
          {!inside && (
            <>
              <div
                className="colibri-orbit"
                aria-label="Choisir un à trois ingrédients"
              >
                {INGREDIENTS.map((i, n) => {
                  const angle =
                    (n / INGREDIENTS.length) * Math.PI * 2 - Math.PI / 2;
                  return (
                    <button
                      key={i.emoji}
                      aria-label={i.name}
                      aria-pressed={choices.includes(i.emoji)}
                      style={{
                        left: `${50 + 50 * Math.cos(angle)}%`,
                        top: `${50 + 50 * Math.sin(angle)}%`,
                      }}
                      onClick={() => select(i.emoji)}
                    >
                      {i.emoji}
                    </button>
                  );
                })}
              </div>
              <button
                className="colibri-enter"
                disabled={!choices.length}
                onClick={() => {
                  setInside(true);
                  setPaused(false);
                }}
              >
                <span>↗</span>
                {choices.length
                  ? "Entrer dans mon monde"
                  : "Choisis tes nuances"}
              </button>
            </>
          )}
        </div>
        {!inside ? (
          <footer>
            <p>
              Choisis de 1 à 3 émojis. Des bulles prennent vie.
              <br />
              Traverse-les pour y découvrir des images, des mots, des possibles.
            </p>
            <div className="colibri-footer-links">
              <button onClick={() => setNotebook(true)}>
                Mon carnet de nectar
              </button>
              <a href="?studio">L’atelier de dessin</a>
            </div>
            <small>
              Une exploration artistique libre, sans interprétation de tes
              choix.
            </small>
          </footer>
        ) : (
          <>
            <div className="colibri-flight-title">
              Squibble <span>•°</span>
            </div>
            <p className="colibri-flight-hint">
              Glisse pour orienter ton vol. Relâche et laisse venir les
              rencontres.
            </p>
            <nav className="colibri-controls" aria-label="Contrôles du vol">
              <button aria-pressed={paused} onClick={() => setPaused(!paused)}>
                {paused ? "Reprendre" : "Pause"}
              </button>
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
                    setMessage((e as Error).message);
                  }
                }}
              >
                360°
              </button>
              <button
                aria-pressed={sound}
                onClick={async () => {
                  try {
                    if (!audio.current) audio.current = new AudioEngine();
                    await audio.current.enable(!sound);
                    setSound(!sound);
                  } catch {
                    setMessage(
                      "Le son reste indisponible. Le voyage continue en silence.",
                    );
                  }
                }}
              >
                {sound ? "Son activé" : "Son"}
              </button>
              <button onClick={() => setNotebook(true)}>Nectar</button>
              <button
                onClick={() => {
                  setInside(false);
                  setGyro(false);
                  input.current.active = false;
                }}
              >
                Le disque
              </button>
            </nav>
          </>
        )}
      </section>
      {message && (
        <p
          className="colibri-notice"
          role="status"
          onClick={() => setMessage("")}
        >
          {message}
        </p>
      )}
      {modal && (
        <div className="colibri-backdrop">
          <div
            className="colibri-card"
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nectar-title"
          >
            {resource ? (
              <>
                <p className="colibri-eyebrow">{kindLabel[resource.kind]}</p>
                {resource.image && (
                  <img
                    src={resource.image}
                    alt={resource.alt || resource.title}
                  />
                )}
                <h2 id="nectar-title">{resource.title}</h2>
                <p className="colibri-resource-text">{resource.text}</p>
                {resource.author && (
                  <p className="colibri-author">{resource.author}</p>
                )}
                <div className="colibri-card-actions">
                  <button
                    onClick={() =>
                      store(
                        nectar.includes(resource.id)
                          ? nectar.filter((id) => id !== resource.id)
                          : [...nectar, resource.id],
                      )
                    }
                  >
                    {nectar.includes(resource.id)
                      ? "Retirer du carnet"
                      : "Garder cette étincelle"}
                  </button>
                  <button className="primary" onClick={() => setResource(null)}>
                    {inside ? "Reprendre le vol" : "Refermer doucement"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="colibri-eyebrow">
                  Les rencontres que tu as choisies
                </p>
                <h2 id="nectar-title">Le carnet de nectar</h2>
                {!nectar.length && (
                  <p>
                    Une image, une phrase, un fragment… Tu pourras garder ici ce
                    que tu souhaites retrouver. Rien n’est à collectionner.
                  </p>
                )}
                <div className="colibri-notebook">
                  {nectar.map((id) => {
                    const r = RESOURCES.find((r) => r.id === id)!;
                    return (
                      <div key={id}>
                        <button
                          onClick={() => {
                            setNotebook(false);
                            setResource(r);
                          }}
                        >
                          {r.title} ↗
                        </button>
                        <button
                          aria-label={"Retirer " + r.title}
                          onClick={() => store(nectar.filter((n) => n !== id))}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
                <p className="colibri-author">
                  Ce carnet reste sur cet appareil, sans envoi ni partage.
                </p>
                <button className="primary" onClick={() => setNotebook(false)}>
                  Refermer le carnet
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
