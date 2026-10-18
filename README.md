# L’Oizo de l’Haïkuarelle Virtuelle

Une seule traversée de six minutes : un oiseau et six brosses d’aquarelle et d’encre fine, dans un ciel peint qui évolue continuellement de la nuit aux aurores puis à l’aube.

Touchez pour tracer et glissez pour guider l’oizo. Sans contact, il rejoint les bulles de haïkus. Deux vues : FPV et gyro. Une pause suspend le voyage. Après six minutes, les lavis ont conservé la mémoire des gestes ; une courte sortie de huit secondes laisse l’oizo s’éloigner avant la vue d’ensemble et la proposition d’une photo PNG HD.

La musique utilise le MP3 local de `public/ambiances`. Pas de synthèse musicale ni de voix. Les 24 bulles apparaissent progressivement (4 / 8 / 12) et révèlent des haïkus originaux en trois vers, sans score ni chronomètre. La piste disponible dure 3 min 42 et boucle jusqu’au final ; aucune composition de six minutes n’est inventée. L’expérience est artistique : son effet auprès de patients n’a pas été évalué cliniquement.

Voir [architecture, validation et limites](docs/six-minute-journey.md). L’entrée ÉchoMood historique reste réversible à `/?legacy=1` ; le paysage précédent à `/?classic=1`. Les outils de capture et l’éditeur ne sont pas proposés pendant le voyage chill.

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
npm test -- tests/oizo-chill.spec.js tests/six-minute-experience.spec.js tests/point-flight.spec.js tests/haikuarelle.spec.js tests/living-pigments.spec.js tests/watercolor-alpha.spec.js
```

L’ancien atelier MP3 reste disponible à `/?atelier=mp3`. Ses fonctions et les modules musicaux historiques ne définissent pas le parcours principal.
