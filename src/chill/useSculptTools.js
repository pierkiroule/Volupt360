import { useEffect, useRef, useState } from "react";

/** Gesture-aware chrome: drawing wins space; controls and keyboard use stay reachable. */
export function useSculptTools({ enabled, sculpting, traveling }) {
  const [hidden, setHidden] = useState(false);
  const timers = useRef({ hide: null, restore: null }),
    held = useRef(null),
    keyboard = useRef(false),
    hovering = useRef(false);
  const auto = useRef(false);
  auto.current = enabled && sculpting && traveling;
  function cancel() {
    clearTimeout(timers.current.hide);
    clearTimeout(timers.current.restore);
  }
  function show() {
    cancel();
    setHidden(false);
  }
  function idle() {
    if (held.current !== null) return;
    cancel();
    if (
      auto.current &&
      !keyboard.current &&
      !hovering.current &&
      held.current === null
    )
      timers.current.hide = setTimeout(() => setHidden(true), 2800);
  }
  function down(e) {
    if (!e.isPrimary || e.button > 0) return;
    cancel();
    held.current = e.pointerId;
    keyboard.current = false;
    if (sculpting) timers.current.hide = setTimeout(() => setHidden(true), 140);
  }
  function end(e) {
    if (held.current !== e.pointerId) return;
    held.current = null;
    cancel();
    timers.current.restore = setTimeout(() => {
      setHidden(false);
      idle();
    }, 850);
  }
  useEffect(() => {
    held.current = null;
    if (!enabled) hovering.current = false;
    show();
    idle();
    return cancel;
  }, [enabled, sculpting, traveling]);
  useEffect(() => {
    const restore = () => {
      held.current = null;
      show();
    };
    const escape = (e) => {
      if (e.key === "Escape") restore();
    };
    window.addEventListener("blur", restore);
    window.addEventListener("keydown", escape);
    const visibility = () => {
      if (document.hidden) restore();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancel();
      window.removeEventListener("blur", restore);
      window.removeEventListener("keydown", escape);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return {
    hidden,
    show,
    stageEvents: {
      onPointerDown: down,
      onPointerUp: end,
      onPointerCancel: end,
      onLostPointerCapture: end,
    },
    toolEvents: {
      onPointerDown: () => {
        keyboard.current = false;
        show();
      },
      onPointerEnter: (e) => {
        if (e.pointerType === "mouse") {
          hovering.current = true;
          show();
        }
      },
      onPointerLeave: (e) => {
        if (e.pointerType === "mouse") {
          hovering.current = false;
          idle();
        }
      },
      onKeyDown: (e) => {
        if (e.key !== "Escape") {
          keyboard.current = true;
          show();
        }
      },
      onPointerUp: idle,
      onPointerCancel: idle,
      onFocus: (e) => {
        if (e.target.matches(":focus-visible")) {
          keyboard.current = true;
          show();
        }
      },
      onBlur: (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          keyboard.current = false;
          idle();
        }
      },
    },
  };
}
