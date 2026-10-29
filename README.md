# ÉmoCiel •° — Étude I : Indigo & terre

**Un paysage d’encre suspendu. Approcher. Traverser. Regarder autrement.**

Une composition unique remplace temporairement les variantes émotionnelles :
une grande formation d’aquarelle indigo et terre cuite, une réserve de papier à
traverser et deux plans secondaires. Aucun empilement de particules, mots ou
filaments. On approche les pigments, traverse l’ouverture puis découvre l’œuvre
sous d’autres angles.

Le voyage peut être orienté au toucher ou arrêté pour contempler. Le gyroscope
est facultatif, avec navigation tactile alternative. Pause, volume et silence
restent accessibles. Les choix emoji antérieurs sont conservés localement mais
leur sélection n’est pas proposée dans cette étude.

React, Vite, TypeScript et Three.js. Pas de backend, d’API d’images ni
d’interprétation psychologique. Deux appels de scène et une simulation
Gray–Scott basse résolution partagée, sans nouveau contexte WebGL. Le grain
et les textures aquarelle sont procéduraux ; les cellules de réaction-diffusion
modulent la matière sans devenir des motifs décoratifs répétitifs.

```sh
npm ci
npm run dev
npm run build
```

Vercel : commande `npm run build`, dossier `dist`.

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/monumental-study.spec.js tests/weather-music.spec.js tests/reaction-diffusion.spec.js
```

La musique repose sur `smplr`, douze samples locaux VCSL/VSCO sous CC0 et trois
boucles rythmiques originales locales. Provenance : `public/audio/emociel/` et
`public/audio/electro/`. Le son démarre après interaction ; les ressources audio
et l’application sont mises en cache en production.

[Composition, architecture, retour arrière et limites](docs/monumental-study.md).
[Historique des versions précédentes](docs/emociel-simple.md).

Le drapeau `MONUMENTAL_STUDY = false` dans `src/simple/MonumentalStudy.ts` permet
de retrouver la palette et les univers précédents après reconstruction. Leur
code et les données utilisateur sont conservés. Pigment Drift (MIT) reste dans
le dépôt, sans simulation active dans cette étude : voir
`src/vendor/pigment-drift/UPSTREAM.md`.
