import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSensoryStore } from "../store/useSensoryStore.ts";
import {
  SENSORY_WORDS as sensoryWords,
  normalizeWord,
} from "../data/sensoryWords.ts";
import { AXES, type SensoryVector } from "../transduction/types.ts";
import { transduce } from "../transduction/engine.ts";
import {
  customWord,
  decodeComposition,
  downloadBlob,
  parseComposition,
  serializeComposition,
  shareLink,
} from "../utils/sensoryComposition.ts";
import { SensoryAudio } from "../audio/sensoryAudio.ts";
import SensoryFallback from "../scene/SensoryFallback.tsx";
import type { Capture } from "../scene/SensoryScene.tsx";
import "../sensory.css";
const Scene = lazy(() => import("../scene/SensoryScene.tsx"));
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function WordComposer() {
  const { composition, setWords } = useSensoryStore(),
    [search, setSearch] = useState(""),
    [own, setOwn] = useState(""),
    [error, setError] = useState("");
  const words = composition.words;
  const add = (word: (typeof words)[number]) => {
    if (words.length >= 5) {
      setError(
        "Cinq mots au maximum : retire un mot pour en accueillir un autre.",
      );
      return;
    }
    if (words.some((w) => w.id === word.id)) return;
    setWords([...words, word]);
    setError("");
  };
  return (
    <>
      <label className="sensory-search">
        Chercher un mot
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Flottement, chaleur…"
        />
      </label>
      <div className="sensory-chips" aria-label="Bibliothèque de mots">
        {sensoryWords
          .filter((w) => normalizeWord(w.label).includes(normalizeWord(search)))
          .map((w) => (
            <button
              key={w.id}
              aria-pressed={words.some((v) => v.id === w.id)}
              disabled={words.length >= 5 && !words.some((v) => v.id === w.id)}
              onClick={() =>
                words.some((v) => v.id === w.id)
                  ? setWords(words.filter((v) => v.id !== w.id))
                  : add({ ...w, intensity: 60 })
              }
            >
              {w.label}
            </button>
          ))}
      </div>
      <p className="sensory-count">
        {words.length}/5 mots · Des inspirations, aucune mesure de ton état.
      </p>
      <div className="sensory-choices">
        {words.map((word) => (
          <div className="sensory-choice" key={word.id}>
            <label>
              {word.label} <output>{word.intensity} %</output>
              <input
                aria-label={`Intensité ${word.label}`}
                type="range"
                min="0"
                max="100"
                value={word.intensity}
                onChange={(e) =>
                  setWords(
                    words.map((w) =>
                      w.id === word.id
                        ? { ...w, intensity: Number(e.target.value) }
                        : w,
                    ),
                  )
                }
              />
            </label>
            <button
              aria-label={`Retirer ${word.label}`}
              onClick={() => setWords(words.filter((w) => w.id !== word.id))}
            >
              ×
            </button>
            {word.custom && (
              <details>
                <summary>Donner une matière à mon mot</summary>
                <p>
                  Ton mot n’est pas interprété automatiquement. Choisis
                  librement ses propriétés ; au départ elles sont neutres.
                </p>
                {AXES.map((axis, i) => (
                  <label key={axis}>
                    {axis}
                    <input
                      aria-label={`${word.label} : ${axis}`}
                      type="range"
                      min="-1"
                      max="1"
                      step=".05"
                      value={word.vector[i]}
                      onChange={(e) =>
                        setWords(
                          words.map((w) => {
                            if (w.id !== word.id) return w;
                            const vector = [...w.vector] as SensoryVector;
                            vector[i] = Number(e.target.value);
                            return { ...w, vector };
                          }),
                        )
                      }
                    />
                  </label>
                ))}
              </details>
            )}
          </div>
        ))}
      </div>
      <form
        className="sensory-custom"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            add(customWord(own));
            setOwn("");
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <label htmlFor="own-word">Ou inventer ton mot</label>
        <div>
          <input
            id="own-word"
            maxLength={40}
            value={own}
            onChange={(e) => setOwn(e.target.value)}
            placeholder="Mon propre mot"
          />
          <button disabled={!own.trim() || words.length >= 5}>Ajouter</button>
        </div>
      </form>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
export default function SensoryExperience() {
  const s = useSensoryStore(),
    [error, setError] = useState(""),
    [simple, setSimple] = useState(false),
    [link, setLink] = useState(""),
    [signature, setSignature] = useState(false),
    audio = useRef<SensoryAudio | null>(null),
    capture = useRef<Capture | null>(null),
    file = useRef<HTMLInputElement>(null);
  const parameters = useMemo(() => transduce(s.composition), [s.composition]);
  const onCapture = useCallback((fn: Capture) => {
      capture.current = fn;
    }, []),
    onFailure = useCallback(() => {
      setSimple(true);
      setError(
        "WebGL indisponible : le ciel reste accessible en vue simplifiée.",
      );
    }, []);
  useEffect(() => {
    document.title = "Mon Ciel Sensoriel •°";
    const hash = new URLSearchParams(location.hash.slice(1)).get("c");
    if (hash) {
      try {
        useSensoryStore.getState().load(decodeComposition(hash));
      } catch (err) {
        setError((err as Error).message);
      }
    }
  }, []);
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,textarea,button,summary"))
        return;
      if (e.key === "Escape") s.patch({ hidden: false, editing: false });
      if (e.code === "Space") {
        e.preventDefault();
        useSensoryStore
          .getState()
          .patch({ paused: !useSensoryStore.getState().paused });
      }
    };
    const visibility = () => {
      if (document.hidden) useSensoryStore.getState().patch({ paused: true });
    };
    window.addEventListener("keydown", keyboard);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", keyboard);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    audio.current?.update(parameters, s.volume);
  }, [parameters, s.volume]);
  useEffect(() => {
    if (audio.current)
      void audio.current.play(s.sound && !s.paused).catch(() => {
        s.patch({ sound: false });
        setError(
          "Le navigateur a suspendu le son. Touche Son pour le relancer.",
        );
      });
  }, [s.sound, s.paused]);
  useEffect(
    () => () => {
      audio.current?.dispose();
      audio.current = null;
    },
    [],
  );
  const sound = async () => {
    try {
      if (!s.sound) {
        if (!audio.current)
          audio.current = new SensoryAudio(s.composition.seed, parameters);
        audio.current.update(parameters, s.volume);
        await audio.current.play(!s.paused);
        s.patch({ sound: true });
      } else {
        s.patch({ sound: false });
        await audio.current?.play(false);
      }
    } catch {
      setError("Le son n’est pas disponible dans ce navigateur.");
      s.patch({ sound: false });
    }
  };
  const png = async () => {
    try {
      if (!capture.current) throw Error("Le ciel se prépare encore.");
      let blob = await capture.current();
      if (signature) {
        const img = await createImageBitmap(blob),
          canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        ctx.font = `${Math.max(14, canvas.width / 65)}px serif`;
        ctx.fillStyle = "#ffffffcc";
        ctx.fillText("Mon Ciel Sensoriel •°", 24, canvas.height - 24);
        img.close();
        blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((b) =>
            b ? resolve(b) : reject(Error("Capture impossible.")),
          ),
        );
      }
      downloadBlob(blob, "mon-ciel-sensoriel.png");
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const load = async (f?: File) => {
    if (!f) return;
    try {
      if (f.size > 32000) throw Error("Fichier trop volumineux.");
      const composition = parseComposition(await f.text());
      audio.current?.dispose();
      audio.current = null;
      s.load(composition);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const fallback = <SensoryFallback onCapture={onCapture} />;
  return (
    <main className={`sensory-app sensory-${s.phase}`}>
      {s.phase === "sky" && (
        <div className="sensory-world">
          {simple ? (
            fallback
          ) : (
            <SceneBoundary fallback={fallback}>
              <Suspense
                fallback={
                  <div className="sensory-loading">
                    Les matières se rencontrent…
                  </div>
                }
              >
                <Scene onCapture={onCapture} onFailure={onFailure} />
              </Suspense>
            </SceneBoundary>
          )}
        </div>
      )}
      {s.phase === "welcome" && (
        <section className="sensory-welcome">
          <div className="sensory-ink" aria-hidden="true" />
          <p className="sensory-eyebrow">Une exploration sensorielle</p>
          <h1>
            MON CIEL
            <br />
            SENSORIEL <span>•°</span>
          </h1>
          <p className="sensory-signature">
            Donne une forme à ce que tu ressens.
          </p>
          <p className="sensory-question">
            Quels mots ressemblent à ce que tu ressens maintenant ?
          </p>
          <button
            className="sensory-primary"
            onClick={() => s.setPhase("compose")}
          >
            Composer mon ciel
          </button>
          <button
            className="sensory-link"
            onClick={() => file.current?.click()}
          >
            Ouvrir une composition
          </button>
          <small>
            Des mots deviennent une matière vivante.
            <br />
            Sans diagnostic, sans score, sans données collectées.
          </small>
        </section>
      )}
      {s.phase === "compose" && (
        <section className="sensory-composer">
          <button
            className="sensory-link"
            onClick={() => s.setPhase("welcome")}
          >
            ← Accueil
          </button>
          <h1>Composer mon ciel</h1>
          <p>
            Jusqu’à cinq mots. Une seule matière, qui les fait résonner
            ensemble.
          </p>
          <WordComposer />
          <button
            className="sensory-primary"
            disabled={!s.composition.words.length}
            onClick={s.birth}
          >
            Faire naître mon ciel
          </button>
        </section>
      )}
      {s.phase === "sky" && (
        <>
          <div className="sensory-essential">
            <button
              onClick={() => s.patch({ paused: !s.paused })}
              aria-label={
                s.paused ? "Reprendre l’expérience" : "Mettre en pause"
              }
            >
              {s.paused ? "▷" : "Ⅱ"}
              <span>{s.paused ? "Reprendre" : "Pause"}</span>
            </button>
            <button
              onClick={() => s.patch({ hidden: !s.hidden })}
              aria-label={
                s.hidden
                  ? "Afficher les commandes"
                  : "Contempler sans interface"
              }
            >
              {s.hidden ? "☷" : "◉"}
              <span>{s.hidden ? "Commandes" : "Contempler"}</span>
            </button>
          </div>
          {!s.hidden && (
            <>
              <header className="sensory-sky-heading">
                <p>MON CIEL SENSORIEL •°</p>
                <small>
                  Glisser pour regarder · Toucher pour faire résonner · Pincer
                  pour la profondeur
                </small>
              </header>
              <nav className="sensory-toolbar" aria-label="Commandes du ciel">
                <button onClick={() => s.patch({ editing: !s.editing })}>
                  Faire évoluer mon ciel
                </button>
                <button onClick={sound} aria-pressed={s.sound}>
                  {s.sound ? "Son activé" : "Activer le son"}
                </button>
                <button onClick={png}>Image PNG</button>
                <button
                  onClick={() =>
                    downloadBlob(
                      new Blob([serializeComposition(s.composition)], {
                        type: "application/json",
                      }),
                      "mon-ciel-sensoriel.json",
                    )
                  }
                >
                  Enregistrer
                </button>
                <button onClick={() => file.current?.click()}>Ouvrir</button>
                <button
                  onClick={() => {
                    try {
                      setLink(shareLink(s.composition));
                    } catch (err) {
                      setError((err as Error).message);
                    }
                  }}
                >
                  Partager
                </button>
              </nav>
            </>
          )}
          {s.editing && !s.hidden && (
            <section
              className="sensory-drawer"
              aria-label="Faire évoluer mon ciel"
            >
              <button
                className="sensory-close"
                onClick={() => s.patch({ editing: false })}
                aria-label="Fermer les réglages"
              >
                ×
              </button>
              <h2>Faire évoluer mon ciel</h2>
              <WordComposer />
              <button onClick={s.restore}>Revenir à mon ciel initial</button>
              <div className="sensory-options">
                <label>
                  Volume
                  <input
                    aria-label="Volume"
                    type="range"
                    min="0"
                    max="1"
                    step=".01"
                    value={s.volume}
                    onChange={(e) =>
                      s.patch({ volume: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={s.reduced}
                    onChange={(e) => s.patch({ reduced: e.target.checked })}
                  />{" "}
                  Mouvements réduits
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={signature}
                    onChange={(e) => setSignature(e.target.checked)}
                  />{" "}
                  Signer l’image
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={simple}
                    onChange={(e) => setSimple(e.target.checked)}
                  />{" "}
                  Vue simplifiée
                </label>
              </div>
              <p className="sensory-note">
                Les correspondances sont artistiques. Elles ne mesurent et
                n’interprètent pas ton état.
              </p>
            </section>
          )}
          {link && !s.hidden && (
            <section className="sensory-share" aria-label="Lien de partage">
              <button
                aria-label="Fermer le partage"
                onClick={() => setLink("")}
              >
                ×
              </button>
              <p>
                Ce lien contient tes mots et leurs intensités. Partage-le
                seulement si tu le souhaites ; rien n’est enregistré sur un
                serveur.
              </p>
              <input
                aria-label="Lien de composition"
                readOnly
                value={link}
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={() =>
                  navigator.clipboard
                    ?.writeText(link)
                    .catch(() =>
                      setError("Sélectionne et copie le lien ci-dessus."),
                    )
                }
              >
                Copier le lien
              </button>
            </section>
          )}
        </>
      )}
      <input
        ref={file}
        hidden
        type="file"
        accept=".json,application/json"
        onChange={(e) => {
          void load(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && (
        <div className="sensory-error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Fermer le message">
            ×
          </button>
        </div>
      )}
    </main>
  );
}
