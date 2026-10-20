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
import { SENSORY_WORDS as sensoryWords } from "../data/sensoryWords.ts";
import { SENSORY_TAGS, emojiFor } from "../data/sensoryTags.ts";
import { transduce } from "../transduction/engine.ts";
import {
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
  const { composition, setWords } = useSensoryStore();
  const words = composition.words;
  return (
    <>
      <div className="sensory-emoji-tags" aria-label="Sensations à composer">
        {SENSORY_TAGS.map((tag) => {
          const word = sensoryWords.find((w) => w.id === tag.id)!;
          const selected = words.some((w) => w.id === tag.id);
          return (
            <button
              key={tag.id}
              aria-label={word.label}
              aria-pressed={selected}
              disabled={words.length >= 5 && !selected}
              onClick={() =>
                setWords(
                  selected
                    ? words.filter((w) => w.id !== tag.id)
                    : [...words, { ...word, intensity: 65 }],
                )
              }
            >
              <span aria-hidden="true">{tag.emoji}</span>
              <small>{word.label}</small>
            </button>
          );
        })}
      </div>
      <p className="sensory-count">
        1 à 5 sensations · Des inspirations, aucune mesure de ton état.
      </p>
      {words.length > 0 && (
        <button className="sensory-link" onClick={() => setWords([])}>
          Effacer la sélection
        </button>
      )}
      <div className="sensory-tag-intensities">
        {words.map((word) => (
          <label key={word.id}>
            <span>
              {emojiFor(word.id)} {word.label}
            </span>
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
            <output>{word.intensity}%</output>
          </label>
        ))}
      </div>
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
            Quelles sensations aimerais-tu explorer ?
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
            Entre au cœur d’un monde peint à l’eau.
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
            Choisis quelques sensations. Elles se mêlent en un univers à
            traverser.
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
                  Glisser pour piloter · Maintenir pour accélérer · Pincer pour
                  le champ
                </small>
              </header>
              <nav className="sensory-toolbar" aria-label="Commandes du ciel">
                <button
                  onClick={() => s.patch({ travel: !s.travel })}
                  aria-pressed={s.travel}
                >
                  {s.travel ? "Vol actif" : "Reprendre le vol"}
                </button>
                <button
                  onClick={() => s.patch({ editing: !s.editing })}
                  aria-label="Ouvrir les options"
                >
                  ⚙
                </button>
                <button
                  onClick={() => {
                    audio.current?.dispose();
                    audio.current = null;
                    s.patch({
                      sound: false,
                      paused: false,
                      editing: false,
                      hidden: false,
                    });
                    s.setPhase("compose");
                  }}
                >
                  Autre ciel
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
              aria-label="Options de contemplation"
            >
              <button
                className="sensory-close"
                onClick={() => s.patch({ editing: false })}
                aria-label="Fermer les réglages"
              >
                ×
              </button>
              <h2>Contemplation</h2>
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
