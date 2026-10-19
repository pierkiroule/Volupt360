import { useEffect, useRef } from "react";
export function HaikuGift({ poem, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="haiku-gift"
      aria-labelledby="haiku-gift-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <span className="haiku-gift-mark" aria-hidden="true">
        ◌
      </span>
      <h2 id="haiku-gift-title">Une graine de paysage</h2>
      <p className="haiku-gift-poem">
        {poem.lines.map((line, index) => (
          <span key={index}>{line}</span>
        ))}
      </p>
      <button autoFocus onClick={onClose}>
        Reprendre l’exploration
      </button>
    </dialog>
  );
}
