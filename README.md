# ÉCHO & HYPNOS •° — Paysage aquarelle

Un oizo sculpte un paysage abstrait en trois dimensions, sur un fond blanc cassé, accompagné par un **MP3 importé depuis votre appareil**. La musique anime les matières ; aucune composition musicale n’est générée dans le parcours actif.

Six brosses composent la palette : **Lavis, Brosse sèche, Encre fine, Éclaboussures, Diffusion et Tampons**. Un appui long ouvre un éditeur local : couleur, taille, opacité et import de texture alpha. Les changements concernent les prochains dépôts et restent dans la session. Glisser doucement guide le vol ; maintenir le canevas fait peindre l’oizo, jamais le doigt.

La caméra FPV suit l’oiseau à environ **6,5 unités** par défaut, avec un grand angle de 86° et une visée centrée sur l’oizo. Le bouton **Vue globale 360°** remplace le zoom : il cadre toute l’œuvre vivante et permet sa rotation ; un second appui revient au mode FPV ou gyro précédent. La contemplation gyro 360°, le cadrage photo, le PNG HD et la vidéodio FPV avec audio sont conservés. Les dépôts dérivent lentement sous des forces et attracteurs mouvants, tout en réagissant à la musique. Le bouton musical permet de suspendre l’ambiance. En FPV ou gyro, « Photographier la vue actuelle » télécharge un instantané PNG HD sans changer de vue.

Voir [l’architecture, les vérifications et les limites](docs/simple-watercolor-landscape.md). Les documents des anciennes versions décrivent des fonctionnalités historiques, parfois retirées du parcours actif.

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
npm test -- tests/simple-landscape.spec.js tests/pictorial-flow.spec.js tests/mobile-living-brushes.spec.js tests/living-flight.spec.js tests/oizo-sunset-story.spec.js tests/oizo-twilight.spec.js
```

L’ancien atelier MP3 reste disponible à `/?atelier=mp3`. Ses fonctions et les modules musicaux historiques ne définissent pas le parcours principal.
