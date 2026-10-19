# OIZO •° — Atelier aquarelle

Un atelier de peinture et de sculpture aquarelle en trois dimensions, sur un ciel blanc.

Un doigt (ou le bouton gauche de la souris) dessine immédiatement sur un plan parallèle à l’écran, à profondeur constante pendant le trait. La pointe volante n’est plus affichée ni utilisée dans l’atelier. Le moteur projette le doigt sur ce plan sans retard de poursuite ; les rubans conservent leur interpolation spatiale.

Deux doigts font pivoter l’œuvre autour du centre. Le pincement règle la profondeur du prochain trait, également accessible par un curseur. À la souris, le bouton droit permet la rotation. Aucune peinture pendant la manipulation : relâcher tous les doigts réarme le dessin. Dessiner un arc, tourner l’œuvre et tracer un second arc permet ainsi de construire un véritable volume avec des gestes précis.

La caméra reste fixe pendant le dessin. Le bouton de contemplation gyro 360° conserve une alternative tactile ; revenir au dessin retrouve le même monde et les mêmes traces. Les anciens parcours conservent leur pilotage.

Cinq matières seulement : encre de nuit, formes corail, pigment cobalt, poussière d’or et taches émeraude. Elles réutilisent cinq moteurs distincts et possèdent chacune une couleur, une silhouette et une texture propre. Leur opacité conserve une base visible même à faible énergie musicale ; l’analyse audio renforce les variations locales des pigments et des particules. Les particules anciennes sont figées et regroupées dans l’archive picturale.

Les textures détaillées sont des plaques RGBA procédurales : charge de pigment, grain du papier, dépôts de séchage et couverture. Elles sont calculées une fois par brosse (256 px sur mobile, 512 px sur ordinateur), avec une graine reproductible et un raccord vertical continu pour les rubans. Les shaders lisent ces détails en conservant les réserves de blanc, les auréoles et la granulation ; les particules dorées utilisent aussi cette matière. Les textures suivent le cycle de libération existant du moteur.

Un bouton bascule entre dessin et contemplation gyro 360°, avec autorisation du capteur et alternative tactile. Gravity accompagne la sculpture et conserve l’analyse musicale des pigments, le volume et la pause. L’atelier n’impose pas de fin chronométrée.

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
