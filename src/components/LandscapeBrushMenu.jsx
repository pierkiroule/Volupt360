import { useRef, useEffect } from "react";

export default function LandscapeBrushMenu({
  selected,
  onSelect,
  brushes,
  onEdit,
}) {
  const gesture = useRef(null),
    suppressClick = useRef(false);
  const cancel = () => {
    if (gesture.current) clearTimeout(gesture.current.timer);
    gesture.current = null;
  };
  useEffect(() => cancel, []);
  return (
    <section className="landscape-palette" aria-label="Palette de brosses">
      <div role="group" aria-label="Choisir une brosse">
        {brushes.map((brush) => (
          <button
            key={brush.id}
            aria-label={brush.name}
            title={`${brush.detail} · appui long pour éditer`}
            aria-pressed={selected === brush.id}
            onPointerDown={(event) => {
              if (event.button > 0 || !event.isPrimary) return;
              cancel();
              suppressClick.current = false;
              const { clientX: x, clientY: y } = event;
              gesture.current = {
                x,
                y,
                timer: setTimeout(() => {
                  suppressClick.current = true;
                  gesture.current = null;
                  onEdit(brush);
                }, 550),
              };
            }}
            onPointerMove={(event) => {
              const g = gesture.current;
              if (
                g &&
                Math.hypot(event.clientX - g.x, event.clientY - g.y) > 10
              )
                cancel();
            }}
            onPointerLeave={cancel}
            onPointerUp={cancel}
            onPointerCancel={cancel}
            onLostPointerCapture={cancel}
            onContextMenu={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              if (
                event.key === "F2" ||
                (event.shiftKey && event.key === "Enter")
              ) {
                event.preventDefault();
                onEdit(brush);
              }
            }}
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              onSelect(brush.id);
            }}
            style={{ "--brush-color": brush.color }}
          >
            <span aria-hidden="true">{brush.glyph}</span>
            <small>{brush.name}</small>
          </button>
        ))}
      </div>
      <p>Glisser pour sculpter · appui long sur une brosse pour éditer</p>
    </section>
  );
}
