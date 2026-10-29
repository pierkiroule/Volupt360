# ÉmoCiel •° — Ton ciel, à ta façon

**Choisir 1 à 3 émojis → faire naître son univers → entrer → contempler ou voyager.**

Douze visages permettent d’associer joie, tristesse, peur, dégoût, colère,
tendresse, émerveillement, surprise, confusion, fatigue, sérénité et nostalgie.
Les choix et leur ordre modifient réellement les couleurs, les matières,
les mouvements, la composition spatiale et l’orchestration musicale. Il ne
s’agit pas d’une interprétation psychologique du visiteur.

L’univers est composé de grandes nappes aquarellées et d’encre, de réserves
mouvantes et de textures à plusieurs échelles. La réaction-diffusion conserve
une mémoire pigmentaire et reçoit des graines musicales et des suggestions de
rencontre spatiale. Les particules restent limitées ; les fragments poétiques
courts sont espacés. Le voyage alterne approche et recul, avec pilotage tactile.
Le gyroscope est facultatif, avec alternative tactile. Pause, volume et silence
restent accessibles. Les sélections sont sauvegardées localement.

React, Vite, TypeScript et Three.js. Aucun backend ni API d’images. La musique
utilise `smplr`, douze samples locaux VCSL/VSCO sous CC0 et trois boucles
rythmiques originales locales. Sources : `public/audio/emociel/` et
`public/audio/electro/`. Son après interaction ; mise en cache en production.

```sh
npm ci
npm run dev
npm run build
```

Vercel : `npm run build`, dossier `dist`.

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/emoji-flow.spec.js tests/simple-cosmo.spec.js tests/universe-identity.spec.js tests/weather-music.spec.js
```

L’étude indigo/terre reste conservée comme essai graphique **inactif**. Le drapeau
`MONUMENTAL_STUDY = false` est le réglage normal : il laisse l’utilisateur composer
son univers. Passer ce drapeau à `true` puis reconstruire ouvre l’étude unique
à la place du parcours ; ce n’est pas un réglage proposé au visiteur.

[Architecture des univers, matériaux et limites](docs/emociel-simple.md).
[Étude graphique facultative](docs/monumental-study.md).
Les données utilisateur et les améliorations de navigation sont conservées.
