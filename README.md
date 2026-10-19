# Haïkuarelle Virtuelle •° — Mon ciel émotionnel

Un seul parcours : **dessiner sur un disque → révéler → contempler ou voyager**.

Le disque blanc cassé propose douze brosses prédéfinies : Doute, Joie, Tristesse, Élan, Soulagement, Tendresse, Peur, Sérénité, Colère, Curiosité, Émerveillement et Tension. Chaque picto possède une couleur, une taille, une transparence et une matière distinctes : encre fine, lavis, granulation, éclats, empreintes, soies, brumes, cristaux, rémanences, spirales, floraisons et nervures. Ce sont des associations artistiques libres, sans inférence psychologique.

Le papier est réellement circulaire : les dépôts sont limités au disque et les gestes hors de sa surface sont ignorés. Le dessin 2D est statique et silencieux. L’annulation reste accessible ; aucun sticker, haïku, panneau de réglages ou dessin FPV.

« Révéler mon ciel » déploie les mêmes traits dans le moteur Three.js existant. Le gyro est demandé depuis le toucher de validation ; le glissement tactile reste disponible si le capteur est absent ou refusé. Le regard ne pilote pas la translation. « Voyager » suit un parcours fermé d’orbites et de traversées autour du volume peint. Suspendre revient à une contemplation stationnaire. La musique Gravity et la réponse audio locale des pigments sont réservées à ce monde 3D. Revenir au dessin coupe la musique et conserve le papier intact.

Les profils sont centralisés dans `src/chill/workshopBrushes.js`, les glyphes dans `materialGlyphs.js`. Les douze moteurs existants sont réutilisés. Le rendu GPU est suspendu en 2D ; les géométries sèches sont regroupées par matériau. Aucun backend, stockage émotionnel ou appel d’API supplémentaire. Le document reste en mémoire pendant la session. Les anciens parcours restent accessibles via leurs paramètres historiques.

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

Vercel : commande `npm run build`, répertoire de sortie `dist`. Aucun backend ni secret nécessaire. Le MP3 Gravity existant est servi depuis `public/ambiances` ; aucun fichier n’est téléversé.

## Tests

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/watercolor-workshop.spec.js
```

Les vérifications couvrent le disque statique et silencieux, les douze matières, la révélation, la musique limitée au monde 3D, le voyage autonome, le gyro refusé avec secours tactile, le retour au papier et les modules de rendu. Le confort du voyage et les capteurs sur appareils physiques restent à valider.
