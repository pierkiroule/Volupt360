# Aquarelle en résonance •° — 2D ↔ 3D

**Une même œuvre, deux dimensions : dessiner sur la page et sculpter dans le paysage.**

L’atelier démarre sur un canevas 2D plein écran. Les douze émojis sélectionnent des
matières abstraites : lavis irréguliers, réserves, pigments secs, granulations,
encres fines, filaments, éclaboussures et auréoles capillaires. Aucune flamme,
feuille, vague figurative ou image d’émoji n’est déposée dans l’œuvre.

Le bouton 3D ouvre la même peinture en panorama spatial ; 2D revient à la page.
Les ajouts des deux côtés se cumulent dans un document commun. L’annulation et
l’effacement portent sur cet historique commun. Les textures, palettes et tracés
sont partagés, avec une animation et des enveloppes spectrales douces dans les deux
vues. La musique existante Gravity continue pendant les changements de dimension.

## Correspondance des deux vues

La page est une carte panoramique de la scène : horizontalement, elle couvre 360° ;
verticalement, du zénith au nadir. Les tracés 2D sont déployés sur la sphère, avec une
légère profondeur de couche. Les trajectoires réalisées en 3D sont projetées sur
cette carte mais conservent intégralement leur trajectoire et leur profondeur dans
le document. Les bascules ne reprojettent donc pas définitivement les données et
n’aplatissent pas la sculpture. Une carte peut superposer des tracés situés à des
profondeurs différentes ; les déformations panoramiques sont visibles près des pôles.
La couture horizontale est traitée en dessinant les passages sur les deux bords.

## Interaction

En 2D, toucher et glisser dessine immédiatement sur toute la page. En 3D, le contact
sculpte devant la caméra et les gestes pilotent le vol ; relâcher arrête le dépôt.
Voyage, gyro et casque VR sont disponibles en 3D. La barre inférieure reste pliable,
translucide et s’efface pendant le geste ; le rappel conserve la brosse choisie.
Les réglages permettent de choisir taille et opacité, ainsi que la distance de dépôt
spatial. Le retour à l’accueil conserve la session. Aucun backend ni analyse
psychologique des symboles.

## Architecture et ressources

- `emojiPainting.js` : grammaire abstraite des douze matières, contours et radii.
- `TwinPaper.jsx` : rendu Canvas 2D animé, saisie plein écran et couture panoramique.
- `twinProjection.js` : projection sphérique et projection inverse.
- `createSpatialEmojiPainter.js` : propriétaire du document partagé et dépôt spatial.
- `spatialBrushFrame.js` : trajectoires 3D conservées dans leur repère d’origine.
- `createPictorialLandscape.js` / `pictorialShaders.js` : mêmes tracés, pigments et
  épaisseurs en géométrie 3D, avec diffusion et gonflements locaux lissés.
- `createPigmentEnvelope.js` : réponse musicale partagée, transmise entre les modes.
- `WatercolorWorkshop.jsx` : bascule, outils, musique, gyro et VR.

Le document reste borné à 80 portions de 256 points source. Les chemins génératifs
et les empreintes sont mis en cache ; les textures ne sont pas créées à chaque
image. La 2D vise environ 30 images/s, un canevas de 1 600 pixels maximum sur son
grand côté et un budget de points/détails. Le rendu WebGL est suspendu pendant la
peinture 2D. Les matières GPU sont partagées et libérées à la destruction. Les anciens
composants figuratifs ne sont plus montés dans le parcours.

La session VR native et les contrôleurs nécessitent un navigateur, un casque et un
contexte HTTPS compatibles. Le matériel physique reste à tester. Les préférences
de réduction des mouvements sont prises en compte dans le rendu de la page.

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
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/watercolor-workshop.spec.js tests/spatial-workshop.spec.js tests/twin-painting.spec.js
```

Les tests couvrent les bascules répétées 2D → 3D → 2D, les ajouts depuis les deux
vues, l’historique partagé, la conservation de profondeur, les projections aux pôles,
les douze signatures abstraites, la continuité d’analyse d’un MP3 et les contrôles
réutilisés de navigation, d’audio et de ressources. Les suites historiques des
parcours retirés ne constituent pas la validation du parcours courant. Le confort,
la fluidité longue durée et la VR sur appareils physiques restent à valider.
