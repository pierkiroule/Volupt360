# OIZO •° — ÉchoMood

**1 à 3 emojis → un univers pictural et musical → cinq brosses → votre OIZO.**

Choisissez parmi 28 inspirations, puis « Faire éclore mon OIZO ». Souffle, Plume, Battement, Éclosion et Envol composent un kit dont les couleurs, textures, mouvements et réponses musicales varient avec la combinaison. Les emojis inspirent la création ; ils ne sont ni un diagnostic ni des éléments décoratifs de la scène.

Sculptez directement au doigt ou à la souris dans un espace en trois dimensions, puis contemplez la matière vivante en vue globale ou gyro. Le vol de l’oizo et son sillage restent accessibles en FPV. L’éditeur de brosse par appui long, le PNG HD et la vidéodio FPV sont conservés.

La musique utilise les MP3 présents dans `public/ambiances`, découverts au démarrage de Vite et au build. Le dépôt contient actuellement **une seule composition** : toutes les combinaisons la partagent jusqu’à l’ajout d’autres ambiances. Les fragments vocaux sont exclus de ce catalogue. Lecture, volume et import personnel restent disponibles ; l’expérience fonctionne silencieusement si la musique est indisponible. Aucun son synthétique ni service externe n’est ajouté.

Voir [l’architecture, le fonctionnement et les limites](docs/echo-mood.md). L’atelier précédent reste accessible à `/?classic=1`, et l’atelier MP3 historique à `/?atelier=mp3`.

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
npm test -- tests/echo-mood.spec.js tests/centered-flight-editor.spec.js tests/tail-wake.spec.js tests/drone-dialogue.spec.js tests/fluid-resonance.spec.js tests/simple-landscape.spec.js tests/living-flight.spec.js tests/pictorial-flow.spec.js tests/mobile-living-brushes.spec.js tests/oizo-sunset-story.spec.js tests/oizo-twilight.spec.js
```

L’ancien atelier MP3 reste disponible à `/?atelier=mp3`. Ses fonctions et les modules musicaux historiques ne définissent pas le parcours principal.
