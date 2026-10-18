import { useEffect, useRef, useState } from "react";
export function HelpResources() {
  const [open, setOpen] = useState(false),
    trigger = useRef(null),
    close = useRef(null);
  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const escape = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open]);
  function dismiss() {
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <aside className="help-resources">
      <button
        ref={trigger}
        className="help-trigger"
        aria-label="Ressources d’aide"
        title="Ressources d’aide"
        aria-expanded={open}
        aria-controls="support-resources"
        onClick={() => setOpen(!open)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5m0 3v1" />
        </svg>
      </button>
      {open && (
        <section
          id="support-resources"
          role="dialog"
          aria-labelledby="support-title"
        >
          <button
            ref={close}
            className="help-close"
            aria-label="Fermer les ressources d’aide"
            onClick={dismiss}
          >
            ×
          </button>
          <h2 id="support-title">Parler à quelqu’un</h2>
          <p>
            Vous pouvez contacter un proche ou un professionnel qui vous
            accompagne.
          </p>
          <p>
            En France : <a href="tel:3114">3114</a>, prévention du suicide,
            gratuit, 24 h/24 et 7 j/7.{" "}
            <a href="https://3114.fr" target="_blank" rel="noreferrer">
              Consulter le site officiel
            </a>
            .
          </p>
          <p>
            Danger immédiat : <a href="tel:112">112</a> en France et dans
            l’Union européenne. Ailleurs, contactez les urgences de votre pays.
          </p>
          <small>
            OIZO-BULLE est une expérience artistique, sans efficacité
            thérapeutique démontrée.
          </small>
        </section>
      )}
    </aside>
  );
}
