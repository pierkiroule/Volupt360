import "./storyWelcome.css";

function PaintedSky() {
  return (
    <div className="story-sky" aria-hidden="true">
      <svg viewBox="0 0 600 620" fill="none">
        <defs>
          <radialGradient id="story-blue" cx=".35" cy=".28" r=".8">
            <stop stopColor="#edf4ed" />
            <stop offset=".45" stopColor="#a8cdcf" stopOpacity=".7" />
            <stop offset="1" stopColor="#609397" stopOpacity=".15" />
          </radialGradient>
          <radialGradient id="story-rose" cx=".3" cy=".25" r=".85">
            <stop stopColor="#f6e9dd" />
            <stop offset=".55" stopColor="#d2a9b5" stopOpacity=".65" />
            <stop offset="1" stopColor="#ac859e" stopOpacity=".2" />
          </radialGradient>
          <radialGradient id="story-gold" cx=".3" cy=".3" r=".8">
            <stop stopColor="#fff6d5" />
            <stop offset=".65" stopColor="#d4c68f" stopOpacity=".55" />
            <stop offset="1" stopColor="#a9b29c" stopOpacity=".15" />
          </radialGradient>
        </defs>
        <path
          className="story-thread"
          d="M65 420C195 420 146 95 308 132S515 415 340 447 237 287 437 252"
          stroke="#678d94"
          strokeWidth=".8"
          strokeDasharray="2 7"
          opacity=".55"
        />
        <path
          d="M87 435C202 490 230 330 330 302s109 21 145-36"
          stroke="#a58b9b"
          strokeWidth=".7"
          opacity=".3"
        />
        <g className="story-orbit story-orbit-one">
          <circle cx="325" cy="282" r="137" fill="url(#story-blue)" />
          <circle
            cx="325"
            cy="282"
            r="136"
            stroke="#729fa3"
            strokeOpacity=".3"
            strokeWidth=".7"
          />
          <path
            d="M232 247c15-42 48-65 86-66"
            stroke="#f9fcf5"
            strokeWidth="2"
            strokeLinecap="round"
            opacity=".8"
          />
        </g>
        <g className="story-orbit story-orbit-two">
          <circle cx="168" cy="417" r="63" fill="url(#story-rose)" />
          <circle
            cx="168"
            cy="417"
            r="62"
            stroke="#ae879c"
            strokeOpacity=".25"
            strokeWidth=".7"
          />
        </g>
        <g className="story-orbit story-orbit-three">
          <circle cx="445" cy="130" r="44" fill="url(#story-gold)" />
          <circle
            cx="445"
            cy="130"
            r="43"
            stroke="#b1aa7c"
            strokeOpacity=".3"
            strokeWidth=".6"
          />
        </g>
        <circle cx="104" cy="224" r="17" fill="url(#story-blue)" />
        <circle cx="462" cy="433" r="25" fill="url(#story-rose)" />
        <g stroke="#7a8c8e" strokeWidth="1" opacity=".55">
          <path d="M125 112v7m-3-3h6M497 319v7m-3-3h6M290 491v7m-3-3h6" />
        </g>
        <g fill="#8ba2a0" opacity=".6">
          <circle cx="196" cy="151" r="1.4" />
          <circle cx="486" cy="224" r="1.2" />
          <circle cx="395" cy="477" r="1.3" />
          <circle cx="221" cy="521" r="1" />
          <circle cx="88" cy="330" r="1.2" />
        </g>
        <g
          className="story-bird"
          stroke="#3b5b60"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path className="story-wing-left" d="M319 320q-19-20-49-15" />
          <path className="story-wing-right" d="M319 320q18-26 48-29" />
          <path d="m319 320 3 5" strokeWidth="1.4" />
        </g>
        <path
          className="story-ink"
          d="M317 337c-18 27-52 23-62 48s21 39 49 36"
          stroke="#66969a"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity=".5"
        />
      </svg>
      <span className="story-paper-wash story-paper-wash-blue" />
      <span className="story-paper-wash story-paper-wash-rose" />
      <span className="story-sky-caption">
        Une rencontre. Une trace. Un autre possible.
      </span>
    </div>
  );
}

export default function StoryWelcome({ busy, onStart, useGyro, onGyroChange }) {
  return (
    <section className="story-welcome" aria-labelledby="story-welcome-title">
      <div className="story-welcome-grain" aria-hidden="true" />
      <div className="story-welcome-inner">
        <div className="story-hero">
          <div className="story-introduction">
            <span className="story-eyebrow">
              <i aria-hidden="true" /> Une histoire qui se traverse
            </span>
            <h1 id="story-welcome-title">
              Oizobul<span>•°</span>
            </h1>
            <p className="story-subtitle">
              Un conte transnumériste échohypnotique
            </p>
            <p className="story-invitation">
              Et si, au lieu de lire une histoire,
              <br className="story-desktop-break" /> tu pouvais voler à travers
              elle ?
            </p>
            <p className="story-description">
              Explore un univers de bulles, de couleurs et de sons. Tu
              t’approches, tu observes, tu écoutes… Chaque bulle dévoile un
              fragment de récit, chaque rencontre réserve une surprise.
            </p>
            <div className="story-launch">
              <button
                className="story-launch-button"
                disabled={busy}
                onClick={onStart}
              >
                <span>
                  {busy ? "Le papier s’éveille…" : "Prendre son envol"}
                </span>
                <svg
                  viewBox="0 0 28 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  aria-hidden="true"
                >
                  <path d="M2 11c5-5 8-5 12 0 4-7 8-9 12-8M14 11l1 3" />
                </svg>
              </button>
              <span className="story-no-goal">
                Rien à réussir. Un ciel à inventer.
              </span>
            </div>
            <label className="story-gyro">
              <input
                type="checkbox"
                checked={useGyro}
                onChange={(event) => onGyroChange(event.target.checked)}
              />
              <span>
                Regarder à 360° avec le téléphone{" "}
                <small>
                  Gyroscope facultatif · glissement toujours disponible
                </small>
              </span>
            </label>
          </div>
          <PaintedSky />
        </div>
        <div className="story-bottom">
          <p className="story-pace">
            Tu avances à ton rythme. Et peu à peu, l’histoire prend forme au gré
            de tes découvertes.
          </p>
          <div className="story-notes" aria-label="Découvrir la démarche">
            <details>
              <summary>
                <span>Pourquoi transnumériste ?</span>
                <span aria-hidden="true">+</span>
              </summary>
              <p>
                Parce qu’ici, le numérique devient un territoire d’imagination.
                Tes mouvements, tes rencontres et tes explorations donnent vie à
                une histoire que tu ne fais pas que regarder : tu la traverses.
              </p>
            </details>
            <details>
              <summary>
                <span>Et l’échohypnose ?</span>
                <span aria-hidden="true">+</span>
              </summary>
              <p>
                Un nom poétique pour cette expérience où les images, les sons et
                les mots résonnent en nous. Comme une musique qui nous
                transporte ou un rêve éveillé qui laisse une trace. Une démarche
                artistique, sans promesse d’effet thérapeutique.
              </p>
            </details>
          </div>
          <p className="story-pleasure">
            <strong>Avec Oizobul, rien à réussir.</strong> Juste le plaisir de
            voler, de découvrir et de se laisser surprendre.
          </p>
          <p className="story-last-line">
            Parfois, il suffit de changer de regard
            <br /> pour que le monde devienne plus léger.
          </p>
          <footer>
            Un conte ouvert · Six minutes de vol, des escales à ton rythme ·
            Avec ou sans son
          </footer>
        </div>
      </div>
    </section>
  );
}
