# EmoCiel360

**Peins ton ciel émotionnel en 2D. Contemple et traverse ta peinture en 360°.**

L’atelier propose cinq outils : Lavis, Pigments secs, Encre, Taches et Gomme.
Couleurs libres, taille et opacité accompagnent des gestes spontanés. Aucun choix
de couleur ou de forme ne reçoit d’interprétation psychologique automatique.

Les empreintes pigmentaires sont superposées avec des orientations variées, sans tuile rectangulaire ni silhouette polygonale répétée. Les matières sont procédurales et reproductibles : granulation, bords irréguliers,
accumulations pigmentaires, réserves de papier, fibres sèches et auréoles. Le lavis
reste connecté ; les taches produisent des silhouettes organiques abstraites.
Les outils, annuler/rétablir, l’export PNG et l’effacement annulable sont dans une
barre pliable. Ctrl/Cmd Z, Maj Z et Y fonctionnent aussi.

## Une peinture vivante, sans audio

La page anime des phénomènes locaux de diffusion et des auréoles, avec des overlays
masqués par la peinture. Le document sec de référence reste inchangé : l’animation
n’érode ni ne remplace les gestes. Les textures sont calculées et mises en cache
pendant la création, jamais pendant l’animation.

« Entrer dans mon ciel » déploie la même image en panorama en relief. Courants,
respiration et ondulations suivent des champs temporels autonomes. Particules et
filaments naissent uniquement des zones peintes et reprennent leurs couleurs.
Il n’y a ni import MP3, ni lecture audio, ni audioreactivité dans ce parcours.
Les variations ne cherchent pas à imposer un rythme respiratoire.

Le voyage peut être suspendu pour contempler. Le regard s’oriente au doigt ou au
gyroscope ; WebXR reste disponible sur matériel compatible. Le retour à la page
retrouve le dessin et son historique. L’export PNG utilise la peinture de référence
sur papier clair, sans les contrôles de l’interface.

## Architecture

- `src/resonant/ResonantPaint.jsx` : atelier et transitions, avec configuration
  projective activée par défaut.
- `projectivePigment.js` : quatre signatures picturales, textures et contours.
- `drawingSurface.js` : image source, commandes, gomme, historique et export.
- `createPaperLife.js` : animation locale Canvas 2D, masques et cache de zones peintes.
- `createResonantWorld.js` : panorama et champs autonomes, réduction des mouvements.
- `createResonantEffects.js` : deux lots GPU de particules et de filaments.
- `src/engine/createSoundNest.js` : moteur Three.js et navigation existants réutilisés.

Les anciens parcours restent accessibles : `?resonant` pour Resonant Paint avec MP3,
`?atelier` pour l’ancien atelier partagé et les paramètres historiques `?legacy`,
`?classic`, `?conte` et `?original`.

## Budgets et limites

Le document de référence fait 1200 × 800 pixels. Il est borné à 300 gestes de 2048
points maximum. Le contour pictural utilise un pas adaptatif pour borner sa complexité.
Le cache contient au maximum 16 jeux de trois empreintes teintées de 192 pixels. La page anime à 25
images/s maximum au repos, et répond directement aux événements de dessin pendant
le geste. La boucle se suspend lorsque l’onglet est caché et respecte la préférence
de réduction des mouvements.

La 3D réutilise sa texture, ses géométries et ses buffers. Les budgets d’effets sont
1400 particules et 32 filaments sur mobile, 3200 particules et 64 filaments sur
ordinateur. Les effets sont entièrement animés sur le GPU. Ressources et écouteurs
sont libérés à la fermeture.

Le relief est une transduction panoramique : les pôles peuvent étirer les traits,
et les bords du dessin se rejoignent. Ce n’est pas une reconstruction volumétrique
physique. La session reste en mémoire : exporter avant de fermer. Pas de calques,
ni de sauvegarde de projet éditable pour l’instant. Les performances prolongées
sur téléphones physiques et casques restent à mesurer. Aucun backend ou transfert
des créations n’est utilisé.

## Développement

Node.js 22.12 minimum, Node 24 recommandé.

```sh
npm ci
npm run dev
npm run build
```

Vercel : `npm run build`, sortie `dist`. Aucun secret ni API payante.

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/emociel.spec.js tests/resonant-paint.spec.js
```

Les tests couvrent les textures, l’historique, les animations autonomes, l’absence
d’import musical dans EmoCiel, la réduction des mouvements et les régressions du
parcours Resonant Paint. Les capteurs réels et le casque doivent être vérifiés sur
les appareils concernés.
