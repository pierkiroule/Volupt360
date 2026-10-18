# OIZO-BULLE •°

On sculpte son ciel émotionnel pour apprendre à le contempler autrement.

Un oiseau peint un ciel aquarelle et encre fine. Huit Mood Brushes symboliques et un lavis neutre accompagnent le geste : toucher peint depuis la queue, glisser guide le vol. Une bulle à la fois émerge de la peinture et ouvre une contemplation 360° du même paysage. « Reprendre le vol » restitue immédiatement le contrôle.

La traversée Nuit → Aurores → Aube dure six minutes de vol actif ; contempler ne consomme pas ce temps. Les 24 phrases originales restent facultatives, sans score ni questionnaire. La musique continue dans les bulles, les pigments persistent et le final conserve la photo PNG HD.

Voir [architecture, paramètres, vérifications et limites](docs/oizo-bulle.md). L’expérience est une médiation artistique, sans efficacité thérapeutique revendiquée ni analyse des émotions. Le gyro est facultatif et réservé aux bulles ; le regard tactile reste disponible.

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
