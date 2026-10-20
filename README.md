# CosmoMood 360•° — Mon univers émotionnel

Une roue, une à trois émotions, un univers aquarellé à contempler ou à parcourir.
La roue reprend les huit familles du modèle théorique de Robert Plutchik : joie,
confiance, peur, surprise, tristesse, dégoût, colère et anticipation. Les opposés
se font face, mais peuvent être sélectionnés ensemble. Les mélanges ne sont pas
classés comme bons ou mauvais et ne donnent lieu à aucune interprétation automatique.

Il s’agit d’une adaptation artistique, pas d’un instrument psychométrique validé
pour tous les publics, ni d’un diagnostic. Source du modèle : Robert Plutchik,
« The Nature of Emotions », American Scientist, 89(4), 2001, p. 344–350 :
https://www.americanscientist.org/article/the-nature-of-emotions

## Parcours

- Choisir 1 à 3 émoji-tags sur la roue, avec une présence visuelle réglable.
- Choisir **Contempler** (regard libre sur place) ou **Voyager** (FPV tactile).
- Entrer dans un univers 3D commun : volumes de pigments, flux de lavis, auréoles,
  encres et grains. Les émojis restent sur la roue, pas dans le monde.
- Chaque famille apporte une palette et un vecteur de mouvement. Les couleurs
  des émotions mêlées restent perceptibles ; leurs propriétés se combinent dans
  un seul champ non linéaire. Ces correspondances sont des conventions artistiques.
- En FPV : glisser dirige, maintenir accélère, pincer modifie le champ. Un retour
  doux maintient le voyage près de la création. Basculer en contemplation garde
  le même monde et la même position.
- Pause, interface masquable, mouvements réduits, son facultatif, volume, PNG,
  sauvegarde JSON et liens de partage sont conservés.
- « Autre univers » revient à la roue ; aucun panneau de transformation pendant le vol.

`src/data/emotionWheel.ts` centralise les huit familles, leurs couleurs, leurs
opposés et les vecteurs artistiques. `src/components/EmotionWheel.tsx` gère la roue
accessible au toucher et au clavier. Le moteur reste indépendant du rendu :
`src/transduction/engine.ts`. Les données sensorielles précédentes et le format
JSON v1 restent lisibles ; la nouvelle roue limite les compositions à trois choix.

Les anciens ateliers restent disponibles via leurs paramètres d’URL.

---

## Architecture du moteur réutilisé et historique sensoriel

## Architecture du parcours sensoriel

- `src/data/sensoryWords.ts` : dictionnaire typé conservé pour la compatibilité des projets.
- `src/data/emotionWheel.ts` : les huit familles de la roue émotionnelle.
- `src/transduction/` : combinaison pondérée indépendante du rendu, interactions
  non linéaires, palette et champs de forces déterministes par graine.
- `src/store/useSensoryStore.ts` : état Zustand, composition initiale, pause,
  préférences et transformations sans remonter la scène.
- `src/scene/SensoryScene.tsx` : R3F, volumes instanciés, flux de pigments,
  filaments et qualité adaptative Drei.
- `src/scene/sensoryWorld.ts` : volumes et courants répartis en profondeur selon la graine.
- `src/scene/DroneNavigation.tsx` : vol tactile, inertie, accélération, arrêt et retour doux.
- `src/shaders/sensoryShaders.ts` : même déformation GPU pour toutes les matières,
  diffusion, grain, étirement, fragmentation, gravité et résonance locale.
- `src/audio/sensoryAudio.ts` : Web Audio native, nappes harmoniques, modulations,
  micro-événements bornés, réverbération procédurale, échos filtrés et compression.
- `src/components/SensoryExperience.tsx` / `src/sensory.css` : interface responsive,
  accessibilité, composition et exports.
- `src/utils/sensoryComposition.ts` : validation, JSON, UTF-8/base64url et exports.
- `src/scene/SensoryFallback.tsx` : ciel SVG de secours sans WebGL et export PNG (sans navigation spatiale).

La scène utilise quatre dessins GPU principaux : 44 volumes organiques instanciés,
22 rubans de lavis, 28 filaments d’encre et 2 400 grains. En qualité réduite :
28 volumes, 12 rubans, 12 filaments, 1 000 grains et DPR 1 au lieu de 1,5 maximum. Pas de textures externes ni de ray marching. Les buffers
sont recréés uniquement quand la graine change ; intensités et couleurs sont
interpolées. Écouteurs, géométries et contexte audio sont nettoyés.

Les volumes sont des surfaces translucides déformées, pas une simulation physique
volumétrique des fluides. Leur mélange est un mélange optique par transparence.

La graine reproduit les paramètres, la disposition et les mouvements à un même
instant d’animation. JSON et lien ne sauvegardent ni le temps écoulé ni le regard :
ils ouvrent la composition depuis son commencement. Les pixels peuvent varier
selon le GPU et la qualité adaptative. Le secours SVG conserve la composition,
mais simplifie la profondeur et les interactions spatiales.

## Développement et vérification

Node.js 22.12 minimum pour Vite ; Node 24 recommandé pour les tests TypeScript natifs.

```sh
npm ci
npm run dev
npm run typecheck
npm run test:sensory
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/sensory-experience.spec.js tests/emotion-disk.spec.js
```

Vercel : `npm run build`, sortie `dist`, aucun secret ni backend requis. Les ateliers
historiques sont chargés séparément : EmoCiel via `?emociel`, puis `?bulle`,
`?peinture`, `?resonant`, `?atelier`, `?legacy`, `?classic`, `?conte`, `?original`.

Les tests navigateur utilisent Chromium avec rendu logiciel. Ils ne certifient
pas 60 FPS sur Android physique, la qualité sonore sur haut-parleur ni la compatibilité
Safari. Ces validations matérielles restent nécessaires. Le build signale toujours
la taille du chunk Three.js (environ 670 ko avant gzip) ; il est chargé à l’entrée
dans le ciel, séparément de l’accueil.

---

## Atelier historique : EmoCiel360 (`?emociel`)

**Un disque de peinture animé, puis un monde 360° à contempler ou à explorer en FPV.**

Les émojis sont uniquement des sélecteurs de brosses : aucun glyphe n’est imprimé
dans l’œuvre. Toucher et glisser sur le disque peint immédiatement un geste continu.
Taille, opacité et annuler/rétablir sont directement accessibles.

## Des émotions comme matières métaphoriques

| Brosse         | Couleur      | Particules symboliques   |
| -------------- | ------------ | ------------------------ |
| Joie           | Ambre        | Soleils et rayons        |
| Tristesse      | Bleu nuit    | Gouttes de pluie         |
| Colère         | Vermillon    | Flammes et braises       |
| Inquiétude     | Violet       | Nœuds et boucles serrées |
| Apaisement     | Turquoise    | Ondes concentriques      |
| Confusion      | Mauve        | Points d’interrogation   |
| Affection      | Rose         | Petits cœurs             |
| Fatigue        | Bleu ardoise | Croissants de lune       |
| Frustration    | Brun ocré    | Fragments de grillage    |
| Émerveillement | Pervenche    | Étoiles et éclats        |
| Espoir         | Vert         | Petites pousses          |
| Indéfinissable | Gris sauge   | Voiles entrecoupés       |

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
