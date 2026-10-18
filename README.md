# OIZO•° — Poetic Learning

**Pourquoi cherchons-nous à nous sentir plus légers ?**

Une exploration aquarellée d’environ quinze minutes : douze bulles scientifiques, trois découvertes par bulle et un voyage qui dessine spontanément le ciel. Regardez une bulle pendant 1,5 seconde pour entrer, puis explorez Mystère, Découverte scientifique et Résonance poétique. Gyroscope facultatif, alternative tactile complète, progression locale et musique Gravity.

Le nouveau parcours réutilise le moteur Three.js, les brosses et l’audio. L’ancien OIZO-BULLE reste disponible avec ?original=1, sans changement de ses interactions. Les ateliers historiques restent accessibles avec ?legacy=1 ou ?classic=1.

Voir [architecture, contenus, sauvegarde, tests et limites](docs/poetic-learning.md). Ce parcours pédagogique ne mesure pas l’état psychologique du visiteur et ne revendique pas d’efficacité thérapeutique.

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
npm test -- tests/poetic-learning.spec.js tests/oizo-bulle.spec.js tests/oizo-chill.spec.js tests/six-minute-experience.spec.js tests/point-flight.spec.js tests/haikuarelle.spec.js tests/living-pigments.spec.js tests/watercolor-alpha.spec.js
```

L’ancien atelier MP3 reste disponible à `/?legacy=1`. Ses fonctions et les modules musicaux historiques ne définissent pas le parcours principal.

Dans l’ancien parcours OIZO-BULLE, les 24 bulles déclenchent des événements picturaux après la reprise du vol : [architecture et vérification](docs/living-narrative-events.md).
