# ÉmoCiel •° — Compose ta météo intérieure

**1 à 3 émojis → une météo singulière → entrer dans son atmosphère → contempler ou voyager.**

Les choix composent un ciel panoramique, des nuages en relief, des trouées
lumineuses, des averses localisées, de la neige, du vent ou une brume nocturne.
Les phénomènes peuvent coexister : une éclaircie parmi les nuages de pluie,
une lumière de fin de jour sous une couverture mouvante. La musique suit les
mêmes choix, sans interprétation psychologique automatique.

Les formations flottent à plusieurs distances et se transforment lentement.
On les approche, les contourne et les traverse. La brume enveloppe doucement
la caméra à l’intérieur d’un nuage. Les formes restent ouvertes à l’imaginaire ;
les mots et les motifs picturaux ne se superposent plus au paysage.

Sélection conservée localement, pilotage tactile, contemplation gyro facultative,
alternative sans capteur, pause, volume et silence. Pas de backend, de
localisation, d’API météo ni de photos téléchargées.

```sh
npm ci
npm run dev
npm run build
```

Vercel : `npm run build`, dossier `dist`.

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/weather-atmosphere.spec.js tests/emoji-flow.spec.js tests/simple-cosmo.spec.js tests/weather-music.spec.js
```

React, Vite, TypeScript et Three.js. Nuages en amas d’imposteurs éclairés,
skydome et précipitations : deux à trois appels de rendu, sans ray marching
volumétrique coûteux. La musique locale repose sur `smplr`, VCSL/VSCO sous CC0
et trois boucles originales ; sources dans `public/audio/`.

[Architecture, limites et retour arrière](docs/atmospheric-weather.md).
Les anciens moteurs aquarelle et l’étude indigo restent conservés mais inactifs.
Les sélections utilisateur ne sont pas effacées. Validation physique mobile
et mesure de performance prolongée restent à effectuer.
