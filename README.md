# OIZO •° — Atelier aquarelle

Un atelier de peinture et de sculpture aquarelle en trois dimensions, sur un ciel blanc.

Glisser guide l’oizo. Maintenir le toucher pendant 320 ms déclenche un seul tracé depuis la pointe du pinceau ailé ; relâcher arrête la peinture et laisse l’oiseau revenir progressivement en orbite autour du centre de l’œuvre. La palette permet de choisir les matières existantes, sans bulles ni récit dans le parcours principal.

Un bouton bascule entre suivi FPV et contemplation gyro 360°, avec autorisation du capteur et alternative tactile. Gravity accompagne la sculpture et conserve l’analyse musicale des pigments, le volume et la pause. L’atelier n’impose pas de fin chronométrée.

Les moteurs de brosses, l’archive picturale et l’export du moteur sont conservés. Le précédent conte reste accessible avec `?conte=1`, son prédécesseur avec `?original=1`.

## Développement

Node.js 22.12 ou supérieur (Node 24 recommandé) et npm.

```sh
npm ci
npm run dev
npm run build
npm run preview
npm run format:check
```

WebGL et Web Audio sont nécessaires. L’orientation mobile nécessite HTTPS (ou localhost), un capteur compatible et, selon l’appareil, l’autorisation native du navigateur.

## Déploiement

Vercel : commande `npm run build`, répertoire de sortie `dist`. Aucun backend ni secret nécessaire. Le MP3 importé est lu localement ; aucun fichier n’est téléversé.

## Tests

```sh
npx playwright install chromium
npm test -- tests/oizo-bulle.spec.js tests/oizo-chill.spec.js tests/six-minute-experience.spec.js tests/point-flight.spec.js tests/haikuarelle.spec.js tests/living-pigments.spec.js tests/watercolor-alpha.spec.js
```

L’ancien atelier MP3 reste disponible à `/?atelier=mp3`. Ses fonctions et les modules musicaux historiques ne définissent pas le parcours principal.
