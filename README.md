# EmoCiel360 — Peindre et traverser ses ressentis

**Un disque de peinture animé, puis un monde 360° à contempler ou à explorer en FPV.**

Les émojis sont uniquement des sélecteurs de brosses : aucun glyphe n’est imprimé
dans l’œuvre. Toucher et glisser sur le disque peint immédiatement un geste continu.
Taille, opacité et annuler/rétablir sont directement accessibles.

## Des émotions comme matières métaphoriques

| Brosse | Couleur | Particules symboliques |
| --- | --- | --- |
| Joie | Ambre | Soleils et rayons |
| Tristesse | Bleu nuit | Gouttes de pluie |
| Colère | Vermillon | Flammes et braises |
| Inquiétude | Violet | Nœuds et boucles serrées |
| Apaisement | Turquoise | Ondes concentriques |
| Confusion | Mauve | Points d’interrogation |
| Affection | Rose | Petits cœurs |
| Fatigue | Bleu ardoise | Croissants de lune |
| Frustration | Brun ocré | Fragments de grillage |
| Émerveillement | Pervenche | Étoiles et éclats |
| Espoir | Vert | Petites pousses |
| Indéfinissable | Gris sauge | Voiles entrecoupés |

Les marques sont dessinées en Canvas dans un atlas partagé de 512 pixels, utilisé
par la page 2D et les particules WebGL. Aucun chargement de police ou de sprite
externe. Les mouvements sont propres à chaque famille (ascension, pluie, dérive,
ondes, hésitation, croissance). L’atlas GPU est libéré avec le moteur météo.

Entre des tracés de feu et de pluie, jusqu’à trois arcs d’orage se dessinent. Leur
intensité varie lentement, sans flash stroboscopique. Ce sont des conventions
artistiques prédéfinies, pas une analyse psychologique ou une causalité émotionnelle.

## Transposition en 360°

Le disque est une carte azimutale : le centre devient le haut du ciel, le bord son
bas, et tous les angles sont conservés autour de soi. Les pixels peints sont
projetés en panorama et les trajectoires servent de sources spatiales aux matières.
Feu, pluie et nuages sont émis uniquement le long des tracés concernés. Les liens
orageux utilisent des positions 3D réelles.

La contemplation garde la caméra immobile et laisse orienter le regard au doigt
ou au gyroscope. Le vol FPV réactive le déplacement : glisser dirige, maintenir
accélère progressivement. Le vol accompagné reste à proximité de l’œuvre.
Revenir peindre restitue le disque, ses tracés et son historique.

Les pistes réversibles et les questions métaphoriques sont conservées. Elles restent
facultatives. La lecture du ciel compte seulement les ressentis explicitement
choisis. L’ambivalence et les besoins peuvent être nommés par la personne ; aucun
diagnostic ni score psychologique n’est calculé. Les animations sont silencieuses
et autonomes, sans audioreactivité.

## Architecture et budgets

- `src/emociel/DiskExperience.jsx` : parcours, palette et historique.
- `EmotionDisk.jsx` : gestes et animation Canvas 2D sur disque.
- `emotionPainting.js` : brosses, effets 2D, projection disque/panorama et sources.
- `createEmotionWeather.js` : flammes, pluie, nuages et arcs sur le GPU.
- `src/resonant/createResonantWorld.js` : matière panoramique et variations visuelles.
- `src/engine/createSoundNest.js` et `createCameraRig.js` : moteur et navigation réutilisés.

Le disque mesure 768 pixels ; le panorama 1536 × 768 pixels. Les textures ne sont
mises à jour qu’à l’entrée en 3D. Les dépôts 2D sont incrémentaux ; les reconstructions
complètes sont réservées aux opérations d’historique. Les effets 2D ont un budget
adaptatif par tracé et la 3D utilise des buffers fixes : 1600 particules mobiles,
3200 sur ordinateur et trois arcs maximum. Le document est borné à 120 gestes de
512 points. Les écouteurs, textures, géométries et boucles sont nettoyés.

Les effets respectent la réduction des mouvements. Le gyroscope reste optionnel,
avec une alternative tactile. Aucun backend, aucune donnée émotionnelle envoyée.
La création reste dans la mémoire de l’onglet : sauvegarde et export de projet ne
sont pas encore proposés dans ce nouveau parcours.

## Limites

Les matières utilisent une projection panoramique en relief et des particules,
pas une simulation volumétrique physique des fluides. Des étirements sont possibles
au centre et au bord de la projection. Les performances prolongées sur téléphones
physiques et les capteurs Android/iOS restent à vérifier. Aucune efficacité
thérapeutique validée n’est revendiquée.

Les anciens parcours sont conservés : `?bulle`, `?peinture`, `?resonant`, `?atelier`,
`?legacy`, `?classic`, `?conte` et `?original`.

## Développement

Node.js 22.12 minimum, Node 24 recommandé.

```sh
npm ci
npm run dev
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/emotion-disk.spec.js tests/orb-experience.spec.js tests/resonant-paint.spec.js tests/spatial-workshop.spec.js
```

Vercel : `npm run build`, sortie `dist`. Aucune dépendance lourde, clé API ou backend ajouté.
