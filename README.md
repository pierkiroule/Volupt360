# Resonant Paint 360

**Le dessin résonant : un atelier 2D, puis son animation immersive à 360°.**

L’application s’ouvre directement sur un éditeur traditionnel : crayon, peinture,
aquarelle texturée, gomme, remplissage par zone, lignes, rectangles, ellipses et
tampons (étoile, cercle, carré, triangle). Couleurs libres, taille, opacité et formes
pleines ou contours complètent les outils. La page reste statique.

Annuler/rétablir fonctionne par boutons et raccourcis Ctrl/Cmd Z, Maj Z ou Y.
L’effacement complet est lui aussi annulable. L’export PNG de 1200 × 800 pixels
contient uniquement le dessin sur papier clair. Les outils se replient.

## Animer son dessin

« Animer en 360° » transpose la page sur une surface panoramique en relief :
les couleurs et la transparence viennent du dessin exact, y compris les zones
effacées. La densité du dessin donne une profondeur au paysage. Trois animations
sont disponibles : Courants, Respiration et Résonances. Les mouvements sont locaux,
lents et adoucis par les enveloppes audio du moteur existant.

Importer son MP3 (20 Mo maximum) active la lecture et l’analyse Web Audio native.
Aucun morceau n’est chargé automatiquement. Sans fichier, l’animation fonctionne
silencieusement. Lecture/pause et volume restent accessibles. Retourner au dessin
suspend l’audio et retrouve les pixels d’origine : la 3D ne modifie pas la page.

Le voyage commence automatiquement ; il peut être suspendu. Gyroscope, navigation
tactile et casque WebXR réutilisent le moteur existant. Le gyroscope et WebXR
nécessitent un navigateur, des capteurs et un contexte HTTPS compatibles.

## Architecture

- `src/resonant/drawingSurface.js` : document de commandes, raster Canvas 2D,
  remplissage, historique et export.
- `src/resonant/ResonantPaint.jsx` : éditeur, outils, MP3 et transitions de vue.
- `src/resonant/createResonantWorld.js` : surface panoramique et trois champs
  d’animation GPU, avec une texture partagée et une géométrie réutilisée.
- `src/engine/createSoundNest.js` : points d’intégration minimaux au moteur Three.js,
  à la caméra et au signal audio existants.
- `src/chill/createPigmentPlate.js` : textures aquarellées procédurales réutilisées.

Le parcours précédent reste accessible avec `?atelier`. Les parcours historiques
`?legacy`, `?classic`, `?conte` et `?original` restent disponibles.

## Performances et limites

Une seule image de référence de 1200 × 800 pixels est envoyée au GPU à l’entrée en
3D. Les animations ne génèrent aucune nouvelle texture par frame. La surface 3D
et sa texture sont réutilisées et libérées à la fermeture. Les commandes sont
bornées à 300 gestes, avec 2048 points maximum par geste et 24 textures aquarelles
teintées dans le cache. Le remplissage est calculé uniquement à la validation et à
la reconstruction de l’historique.

Le panorama peut étirer les dessins près des pôles et raccorder leurs deux bords.
Il s’agit d’une transduction animée de l’image, pas d’une reconstruction volumétrique
physique. La session reste en mémoire ; exporter le PNG avant de fermer la page.
Il n’y a pas encore de calques, de sélection ou de sauvegarde de projet éditable.
Les performances prolongées sur téléphone physique et les casques restent à vérifier.
Aucune donnée ni fichier audio n’est envoyé à un serveur.

## Développement et déploiement

Node.js 22.12 minimum, Node 24 recommandé.

```sh
npm ci
npm run dev
npm run build
```

Vercel : commande `npm run build`, sortie `dist`. Aucun backend, aucune clé API.

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/resonant-paint.spec.js tests/twin-painting.spec.js tests/spatial-workshop.spec.js tests/watercolor-workshop.spec.js tests/watercolor-library.spec.js
```

Les tests couvrent le remplissage réel, l’opacité, la gomme, l’historique, le tactile,
l’export PNG, les transitions 2D/3D, l’import d’un véritable fichier audio de test,
les shaders et la libération des ressources. Les tests des anciens parcours utilisent
`?atelier` pour contrôler leurs régressions sans changer l’entrée principale.
