# ÉmoCiel •°

**Compose ton ciel émotionnel et traverse-le tranquillement en 360°.**

Douze visages expressifs composent un monde aquarellé : joie, tristesse, peur, dégoût, colère, tendresse, émerveillement, surprise, confusion, fatigue, sérénité et nostalgie. Choisis une à trois nuances, entre, contemple ou laisse-toi porter par un voyage lent. Chaque visage possède ses couleurs, ses matières et sa composition musicale ; leurs mélanges gardent leurs contrastes. Les volutes d’encre noire, pigments et particules dialoguent avec le son. Glisse pendant le voyage pour infléchir la traversée ; au relâchement, le parcours reprend doucement. Gyroscope facultatif pour la contemplation ; pause accessible à tout moment.

React, Vite, TypeScript et Three.js. Aucun backend, modèle 3D distant ou interprétation des émotions. Six membranes abstraites Three.js remplacent les photographies : plis, rubans humides et filaments évoluent selon les visages choisis. Aucun chargement de photographies ni accès à une API externe. Les choix restent sur l’appareil.

```sh
npm ci
npm run dev
npm run build
```

Vercel : commande `npm run build`, dossier `dist`. L’application s’ouvre sur la nouvelle expérience, quel que soit l’ancien paramètre d’URL.

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/simple-cosmo.spec.js tests/weather-composition.spec.js tests/painterly-sky.spec.js
```

[Architecture, performances et limites](docs/emociel-simple.md). Les anciens parcours sont conservés dans les sources pour archivage ; ils ne sont plus chargés par l’application. Les anciennes sauvegardes restent intactes.


Le toucher d’Entrer lance la traversée immersive et la musique ; ♫ permet de couper le son ou de régler le volume. Le moteur `smplr` joue douze échantillons locaux VCSL et VSCO (piano Kawai, marimba doux, vibraphone frotté et violoncelles), sous CC0. Les choix orientent une composition pentatonique évolutive : orchestration, densité, harmonie lente et espace stéréo. Volume, silence et pause sont disponibles. Les samples sont mis en cache avec l’application en production. Sources et licence : `public/audio/emociel/`.

Matière musicale : le premier voile abstrait reçoit une peinture à mémoire GPU issue de Pigment Drift Paint Studio (MIT). Active ♫ pour que la musique dépose et déplace l’eau et les pigments ; en silence, la matière continue doucement à diffuser et sécher. Simulation partagée 128 × 128 sur mobile / 192 × 192 sur ordinateur, interpolation entre états et cadence bornée et rendu procédural de secours. Provenance et limites : `src/vendor/pigment-drift/UPSTREAM.md` et `docs/emociel-simple.md`.

Le voyage possède une accélération douce, une légère respiration de focale et de rares effets optiques de flou périphérique et de contours d’encre. Ces effets sont limités à une passe et se désactivent en qualité réduite.

117 fragments originaux composent une poésie ouverte selon les ressentis choisis et leurs rencontres. Piano mélodique, réponses de marimba, résonances frottées et accords de violoncelles partagent une même écriture harmonique. Les notes infléchissent les plis et les réserves de pigment ; aucune interprétation automatique du vécu n’est produite.


Direction électro : trois drumloops originaux de quatre mesures à 104 BPM (régulier, syncopé, aéré), basse sinusoïdale et arpèges de marimba synchronisés. Le mix rythmique dépend des météos. Les percussions restent plus sèches, les instruments respirent légèrement sur la pulsation. Les plis, les particules et les déformations optiques partagent l’horloge musicale. Les boucles sont locales et mises en cache ; leur synthèse originale est reproductible avec `scripts/generate-electro-loops.py` (Python, NumPy et FFmpeg, uniquement pour régénérer les assets).

Chaque séquence dispose désormais d’une identité spatiale : douze univers et sept familles de rencontres, avec formes, ciels, profondeur, palettes et orchestration propres. Le premier émoji donne l’ancrage ; les suivants le transforment. L’ordre des choix est conservé et participe à la composition.
