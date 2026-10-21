import { useEffect, useRef, useState } from "react";
import { searchPolyHaven, loadPolyHaven } from "./polyHaven.js";
export default function PolyHavenPanel({ brush, current, onApply, onClose }) {
  const [query, setQuery] = useState("rock"),
    [items, setItems] = useState([]),
    [status, setStatus] = useState("Chargement…"),
    [busy, setBusy] = useState(false);
  const controller = useRef(null),
    mounted = useRef(false);
  async function search(value) {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setBusy(true);
    setStatus("Chargement…");
    try {
      const result = await searchPolyHaven(value, c.signal);
      if (c.signal.aborted || !mounted.current) return;
      setItems(result);
      setStatus(
        result.length ? `${result.length} textures` : "Aucune texture trouvée",
      );
    } catch (error) {
      if (!c.signal.aborted && mounted.current) {
        setItems([]);
        setStatus("Poly Haven indisponible. Les alphas locaux restent actifs.");
      }
    } finally {
      if (!c.signal.aborted && mounted.current) setBusy(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    search("rock");
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  async function apply(asset) {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setBusy(true);
    setStatus("Préparation de la matière…");
    try {
      const result = await loadPolyHaven(asset, c.signal);
      if (c.signal.aborted || !mounted.current) return;
      onApply(result);
      setStatus(`${result.name} appliquée à ${brush.name}`);
    } catch (error) {
      if (!c.signal.aborted && mounted.current)
        setStatus("Texture inaccessible. La matière actuelle est conservée.");
    } finally {
      if (!c.signal.aborted && mounted.current) setBusy(false);
    }
  }
  return (
    <aside className="squiggle-material-panel" aria-label="Matières Poly Haven">
      <header>
        <div>
          <strong>Textures · Poly Haven</strong>
          <small>
            Pour la brosse {brush.emoji} {brush.name}
          </small>
        </div>
        <button aria-label="Fermer les matières" onClick={onClose}>
          ×
        </button>
      </header>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(query);
        }}
      >
        <input
          aria-label="Rechercher une texture"
          value={query}
          placeholder="rock, wood, ground…"
          onChange={(e) => setQuery(e.target.value)}
        />
        <button disabled={busy}>Rechercher</button>
      </form>
      <p role="status">{status}</p>
      {current && (
        <p>
          <a href={current.source} target="_blank" rel="noreferrer">
            {current.name}
          </a>{" "}
          ·{" "}
          <button
            onClick={() => {
              onApply(null);
              setStatus("Alpha local rétabli");
            }}
            disabled={busy}
          >
            Alpha local
          </button>
        </p>
      )}
      <div className="squiggle-material-gallery">
        {items.map((a) => (
          <button
            key={a.id}
            disabled={busy}
            onClick={() => apply(a)}
            aria-pressed={current?.id === a.id}
            aria-label={`Appliquer ${a.name}`}
          >
            <img src={a.thumbnail} alt="" loading="lazy" />
            <span>{a.name}</span>
          </button>
        ))}
      </div>
      <footer>
        <a
          href="https://polyhaven.com/license"
          target="_blank"
          rel="noreferrer"
        >
          Textures CC0 · Poly Haven
        </a>
      </footer>
    </aside>
  );
}
