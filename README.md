# L’Oizo chill

Une seule expérience de cinq minutes : un oiseau, six brosses d’aquarelle et d’encre fine, des grains de pigment audioreactifs et une atmosphère de papier aquarellé sans horizon figuratif.

Touchez pour tracer et glissez pour guider l’oizo. Sans contact, il rejoint les bulles de sagesse. Deux vues : FPV et gyro. Une pause suspend le voyage. Après cinq minutes, les lavis se sont doucement transformés ; une courte sortie de huit secondes laisse l’oizo s’éloigner avant la vue d’ensemble et la proposition d’une photo PNG HD.

La musique utilise le MP3 local de `public/ambiances`. Pas de synthèse musicale ni de voix. Les 24 bulles révèlent des proverbes et des citations du domaine public, avec leur source. L’expérience est artistique : son effet auprès de patients n’a pas été évalué cliniquement.

Voir [architecture, validation et limites](docs/oizo-chill.md). L’entrée ÉchoMood historique reste réversible à `/?legacy=1` ; le paysage précédent à `/?classic=1`. Les outils de capture et l’éditeur ne sont pas proposés pendant le voyage chill.

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
