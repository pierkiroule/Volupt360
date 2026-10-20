import { useRef } from "react";
/** Activate once on touch release, including immediately after a captured sphere drag.
 * Keep native keyboard/mouse clicks and cancel touch gestures that leave the button.
 */
export function TouchButton({
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  disabled,
  ...props
}) {
  const held = useRef(null),
    handled = useRef(false);
  return (
    <button
      {...props}
      disabled={disabled}
      onPointerDown={(e) => {
        handled.current = false;
        held.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        const start = held.current;
        held.current = null;
        onPointerUp?.(e);
        if (e.pointerType !== "touch" || disabled || start?.id !== e.pointerId)
          return;
        const r = e.currentTarget.getBoundingClientRect();
        if (
          Math.hypot(start.x - e.clientX, start.y - e.clientY) > 10 ||
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          return;
        handled.current = true;
        onClick?.(e);
      }}
      onPointerCancel={(e) => {
        held.current = null;
        handled.current = false;
        onPointerCancel?.(e);
      }}
      onClick={(e) => {
        if (e.detail === 0 || !handled.current) onClick?.(e);
        handled.current = false;
      }}
    />
  );
}
