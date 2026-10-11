import { useEffect, useRef, useState } from "react";
import TexturePalette from "./TexturePalette.jsx";
import { BRUSHES } from "../engine/brushes.js";

export default function BrushSelector({
  selected,
  onChange,
  textures = {},
  onTexture,
}) {
  const [textureBrush, setTextureBrush] = useState(null);
  const gesture = useRef(null),
    timer = useRef(null),
    suppressClick = useRef(null);
  const [held, setHeld] = useState(null);
  const clear = () => {
    clearTimeout(timer.current);
    gesture.current = null;
    setHeld(null);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  function start(event, id) {
    if (!event.isPrimary || event.button > 0) return;
    clear();
    suppressClick.current = null;
    gesture.current = {
      id,
      pointer: event.pointerId,
      time: performance.now(),
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    timer.current = setTimeout(() => setHeld(id), 550);
  }
  function release(event, id) {
    const pressed = gesture.current;
    const isLong =
      pressed?.id === id &&
      pressed.pointer === event.pointerId &&
      performance.now() - pressed.time >= 550;
    clear();
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (isLong) {
      suppressClick.current = id;
    }
  }
  return (
    <div
      className="brush-palette"
      role="group"
      aria-label="Palette aquarelle : douze brosses"
    >
      <span id="texture-help" className="sr-only">
        Maintenir puis relâcher pour choisir une texture. Au clavier : Majuscule
        et Entrée.
      </span>
      {BRUSHES.map((brush) => (
        <div className="brush-slot" key={brush.id}>
          <button
            className={`brush brush-${brush.id} ${textures[brush.id] ? "has-texture" : ""} ${held === brush.id ? "is-held" : ""}`}
            aria-label={brush.name}
            aria-describedby="texture-help"
            aria-pressed={selected === brush.id}
            title={`${brush.detail} · Maintenir pour choisir une texture${textures[brush.id] ? ` · ${textures[brush.id].name}` : ""}`}
            style={{ "--pigment": brush.color }}
            onPointerDown={(event) => start(event, brush.id)}
            onPointerMove={(event) => {
              if (
                gesture.current?.id === brush.id &&
                Math.hypot(
                  event.clientX - gesture.current.x,
                  event.clientY - gesture.current.y,
                ) > 12
              )
                clear();
            }}
            onPointerUp={(event) => release(event, brush.id)}
            onPointerCancel={clear}
            onContextMenu={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              suppressClick.current = null;
              if (event.key === "Enter" && event.shiftKey) {
                event.preventDefault();
                setTextureBrush(brush.id);
              }
            }}
            onClick={() => {
              if (suppressClick.current === brush.id) {
                suppressClick.current = null;
                setTextureBrush(brush.id);
                return;
              }
              onChange(brush.id);
            }}
          >
            <span className="brush-swatch" aria-hidden="true">
              {textures[brush.id] ? (
                <img src={textures[brush.id].preview} alt="" />
              ) : (
                brush.glyph
              )}
            </span>
            <span>{brush.name}</span>
            {textures[brush.id] && (
              <span className="texture-dot" aria-hidden="true" />
            )}
          </button>
        </div>
      ))}
      {textureBrush && (
        <div className="brush-texture-popover">
          <TexturePalette
            brush={BRUSHES.find((item) => item.id === textureBrush).name}
            selected={textures[textureBrush]?.id}
            onSelect={(id) => {
              onTexture(textureBrush, id);
              setTextureBrush(null);
            }}
          />
          <button
            onClick={() => setTextureBrush(null)}
            aria-label="Fermer les textures"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}
