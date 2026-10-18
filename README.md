# OIZO-BULLE •°

On sculpte son ciel émotionnel pour apprendre à le contempler autrement.

Oizobul explore une constellation de 24 bulles lumineuses. Chacune contient un court fragment autonome d’un conte échohypnotique : plume, fenêtre bleue, branche et nuage se répondent, sans ordre de lecture imposé.

Glisser guide le vol. Au relâchement, Oizobul rejoint doucement la bulle lumineuse la plus proche. Aucune peinture avant une rencontre : à la sortie d’une bulle, il emporte une matière et peint automatiquement depuis ses ailes. Les bulles visitées s’éteignent mais restent présentes. Des acrobaties occasionnelles accompagnent le vol libre ; toucher reprend immédiatement le pilotage.

Le parcours conserve six minutes de vol actif, la métamorphose Nuit → Aurores → Aube, Gravity, le POV 360° tactile/gyroscope et le PNG HD. La lecture suspend le temps de vol et reste affichée jusqu’à « Reprendre le vol ». Le ciel garde les empreintes picturales des rencontres.

Voir [le conte en constellation](docs/oizobul-constellation.md). Le parcours précédent reste accessible avec ?original=1 ; ses brosses et figures manuelles sont conservées. Cette expérience artistique ne revendique pas d’efficacité thérapeutique et n’analyse pas les émotions.

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
