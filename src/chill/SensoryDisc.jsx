import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { SENSORY_EMOJIS, emojiById } from "./sensoryEmojiCatalog.js";
import {
  emptySensoryGraph,
  addSensoryNode,
  moveSensoryNode,
  removeSensoryNode,
  initialSensoryContacts,
} from "./sensoryGraph.js";
import { ToolIcon } from "./ToolIcon.jsx";

export const SensoryDisc = forwardRef(function SensoryDisc(
  { visible, onChange, onReveal, busy, instruction, onInstruction },
  ref,
) {
  const [graph, setGraph] = useState(emptySensoryGraph),
    [selected, setSelected] = useState(null),
    [armed, setArmed] = useState("bubbles"),
    [size, setSize] = useState(52),
    [opacity, setOpacity] = useState(0.85),
    [ghost, setGhost] = useState(null);
  const disc = useRef(null),
    current = useRef(graph),
    history = useRef([]),
    drag = useRef(null),
    serial = useRef(0),
    suppressClick = useRef(false);
  function commit(next, checkpoint = false) {
    if (checkpoint) {
      history.current.push(current.current);
      if (history.current.length > 60) history.current.shift();
    }
    current.current = next;
    setGraph(next);
    onChange?.(next.nodes.length);
  }
  function undo() {
    const last = history.current.pop();
    if (last) commit(last);
    setSelected(null);
  }
  useImperativeHandle(ref, () => ({
    getDocument: () => structuredClone(current.current),
    clear() {
      history.current = [];
      commit(emptySensoryGraph());
      setSelected(null);
    },
    undo,
  }));
  const point = (event) => {
    const r = disc.current.getBoundingClientRect();
    return {
      u: (event.clientX - r.left) / r.width,
      v: (event.clientY - r.top) / r.height,
    };
  };
  function add(emojiId, p) {
    const node = {
      id: `node-${serial.current++}`,
      emojiId,
      ...p,
      size: size / disc.current.getBoundingClientRect().width,
      opacity,
    };
    const next = addSensoryNode(current.current, node);
    if (next !== current.current) {
      commit(next, true);
      setSelected(node.id);
    }
  }
  function down(event, item) {
    if (event.button > 0 || !event.isPrimary || drag.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      ...item,
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      contacts: item.id
        ? initialSensoryContacts(current.current, item.id)
        : new Set(),
      checkpoint: false,
    };
    if (item.id) {
      setSelected(item.id);
      const node = current.current.nodes.find((n) => n.id === item.id);
      setSize(
        Math.round(node.size * disc.current.getBoundingClientRect().width),
      );
      setOpacity(node.opacity);
    } else {
      setSelected(null);
      setArmed(item.emojiId);
    }
  }
  function move(event) {
    const d = drag.current;
    if (!d || d.pointer !== event.pointerId) return;
    if (Math.hypot(event.clientX - d.x, event.clientY - d.y) < 4 && !d.moved)
      return;
    d.moved = true;
    if (d.id) {
      const next = moveSensoryNode(
        current.current,
        d.id,
        point(event),
        d.contacts,
      );
      commit(next, !d.checkpoint);
      d.checkpoint = true;
    } else setGhost({ emojiId: d.emojiId, x: event.clientX, y: event.clientY });
  }
  function up(event) {
    const d = drag.current;
    if (!d || d.pointer !== event.pointerId) return;
    if (!d.id && d.moved) {
      const p = point(event);
      if (Math.hypot(p.u - 0.5, p.v - 0.5) <= 0.5) add(d.emojiId, p);
    }
    suppressClick.current = d.moved;
    drag.current = null;
    setGhost(null);
  }
  function resize(nextSize, nextOpacity) {
    setSize(nextSize);
    setOpacity(nextOpacity);
    if (!selected) return;
    const node = current.current.nodes.find((n) => n.id === selected);
    if (!node) return;
    const updated = {
      ...node,
      size: nextSize / disc.current.getBoundingClientRect().width,
      opacity: nextOpacity,
    };
    // Property changes do not create a collision: only an intentional bump does.
    const p = point({
      clientX:
        disc.current.getBoundingClientRect().left +
        node.u * disc.current.getBoundingClientRect().width,
      clientY:
        disc.current.getBoundingClientRect().top +
        node.v * disc.current.getBoundingClientRect().height,
    });
    const limit = 0.5 - updated.size / 2,
      distance = Math.hypot(p.u - 0.5, p.v - 0.5),
      scale = distance > limit ? limit / distance : 1;
    commit(
      {
        ...current.current,
        nodes: current.current.nodes.map((n) =>
          n.id === selected
            ? {
                ...updated,
                u: 0.5 + (p.u - 0.5) * scale,
                v: 0.5 + (p.v - 0.5) * scale,
              }
            : n,
        ),
      },
      true,
    );
  }
  return (
    <section
      className="sensory-editor"
      hidden={!visible}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        drag.current = null;
        setGhost(null);
      }}
    >
      <details className="sensory-instruction">
        <summary>
          Décore ton ciel avec les émojis qui résonnent avec…{" "}
          <span>{instruction}</span>
        </summary>
        <label>
          Personnaliser la consigne
          <textarea
            aria-label="Compléter la consigne"
            maxLength={240}
            value={instruction}
            onChange={(e) => onInstruction(e.target.value)}
          />
        </label>
      </details>
      <div className="sensory-orbit">
        <div
          className="sensory-disc"
          ref={disc}
          role="group"
          aria-label="Mon disque sensoriel"
          tabIndex={0}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget && armed) {
              const p = point(e);
              if (Math.hypot(p.u - 0.5, p.v - 0.5) <= 0.5) add(armed, p);
            }
          }}
          onKeyDown={(e) => {
            if (e.target === e.currentTarget && e.key === "Enter") {
              e.preventDefault();
              add(armed, { u: 0.5, v: 0.5 });
            }
          }}
        >
          <svg
            className="sensory-disc-links"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            {graph.links.map((l) => {
              const a = graph.nodes.find((n) => n.id === l.a),
                b = graph.nodes.find((n) => n.id === l.b);
              return (
                <line
                  key={l.id}
                  x1={a.u * 100}
                  y1={a.v * 100}
                  x2={b.u * 100}
                  y2={b.v * 100}
                  stroke={emojiById(a.emojiId).color}
                />
              );
            })}
          </svg>
          {graph.nodes.map((n) => (
            <button
              key={n.id}
              className="sensory-node"
              data-node-id={n.id}
              aria-label={`Déplacer ${emojiById(n.emojiId).name}`}
              aria-pressed={selected === n.id}
              style={{
                left: `${n.u * 100}%`,
                top: `${n.v * 100}%`,
                width: `${n.size * 100}%`,
                height: `${n.size * 100}%`,
                opacity: n.opacity,
                fontSize: `calc(var(--sensory-disc-size) * ${n.size * 0.82})`,
              }}
              onPointerDown={(e) => down(e, { id: n.id })}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                setSelected(n.id);
                setSize(
                  Math.round(
                    n.size * disc.current.getBoundingClientRect().width,
                  ),
                );
                setOpacity(n.opacity);
              }}
              onKeyDown={(e) => {
                if (e.key === "Delete" || e.key === "Backspace") {
                  e.preventDefault();
                  commit(removeSensoryNode(current.current, n.id), true);
                  setSelected(null);
                } else if (e.key.startsWith("Arrow")) {
                  e.preventDefault();
                  const delta = {
                    ArrowLeft: [-0.025, 0],
                    ArrowRight: [0.025, 0],
                    ArrowUp: [0, -0.025],
                    ArrowDown: [0, 0.025],
                  }[e.key];
                  if (delta)
                    commit(
                      moveSensoryNode(current.current, n.id, {
                        u: n.u + delta[0],
                        v: n.v + delta[1],
                      }),
                      true,
                    );
                }
              }}
            >
              {emojiById(n.emojiId).emoji}
            </button>
          ))}
        </div>
        <div
          className="sensory-ring"
          role="group"
          aria-label="Palette sensorielle"
        >
          {SENSORY_EMOJIS.map((e, i) => (
            <button
              key={e.id}
              aria-label={`Ajouter ${e.name}`}
              title={e.name}
              aria-pressed={armed === e.id}
              style={{
                "--orbit-x": Math.cos((i * Math.PI) / 6 - Math.PI / 2),
                "--orbit-y": Math.sin((i * Math.PI) / 6 - Math.PI / 2),
              }}
              onPointerDown={(event) => down(event, { emojiId: e.id })}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                setArmed(e.id);
                setSelected(null);
              }}
            >
              {e.emoji}
            </button>
          ))}
        </div>
      </div>
      {ghost && (
        <span
          className="sensory-drag-ghost"
          aria-hidden="true"
          style={{ left: ghost.x, top: ghost.y, fontSize: size, opacity }}
        >
          {emojiById(ghost.emojiId).emoji}
        </span>
      )}
      <nav className="sensory-compose-tools" aria-label="Composer mon paysage">
        <p>Glisse un émoji. Fais-les se toucher pour relier ou délier.</p>
        <div className="sensory-settings">
          <label>
            Taille
            <input
              type="range"
              aria-label="Taille de l’émoji"
              min="24"
              max="90"
              value={size}
              onChange={(e) => resize(Number(e.target.value), opacity)}
            />
          </label>
          <label>
            Opacité
            <input
              type="range"
              aria-label="Opacité de l’émoji"
              min=".2"
              max="1"
              step=".05"
              value={opacity}
              onChange={(e) => resize(size, Number(e.target.value))}
            />
          </label>
          <button
            aria-label="Annuler"
            disabled={!history.current.length}
            onClick={undo}
          >
            <ToolIcon name="undo" />
          </button>
          {selected && (
            <button
              aria-label="Supprimer l’émoji"
              onClick={() => {
                commit(removeSensoryNode(current.current, selected), true);
                setSelected(null);
              }}
            >
              ×
            </button>
          )}
        </div>
        <button
          className="sensory-reveal"
          disabled={!graph.nodes.length || busy}
          onClick={onReveal}
        >
          {busy ? "Le paysage s’éveille…" : "Révéler mon paysage"}
        </button>
      </nav>
    </section>
  );
});
