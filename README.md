# Squiggle 360 — Dessiner, puis entrer dans son dessin

La page principale ouvre directement une feuille animée plein écran. Huit brosses
émoji sélectionnent huit dynamiques de pigments abstraits : voiles, diffusion,
remous, nappes et poussières. Aucun pictogramme ni dessin figuratif n’est émis. Taille et annulation restent accessibles ;
le bouton « Autres outils » déplie opacité, gomme par tracé, rétablissement,
pause des animations, export PNG et effacement.

Le bouton **360°** projette le même document sur un panorama intérieur avec
ses effets animés. **Peindre** ajoute des gestes au document partagé ;
**Regarder** permet de tourner la vue au doigt, à la souris ou avec le gyroscope.
**Voyager** avance en FPV : glisser oriente le vol, maintenir accélère progressivement.
Relâcher conserve une allure lente ; une assistance ramène le vol vers l’intérieur
avant le bord du panorama. **Pause vol** immobilise immédiatement la caméra.
Le voyage ne dessine pas ; revenir à **Peindre** permet de tracer depuis le nouveau
point de vue. Les gestes ajoutés en 360° retrouvent leur place sur la feuille 2D. La couture
panoramique découpe les gestes qui la traversent. Il s’agit d’une peinture
panoramique avec effets dans l’espace, pas d’un éditeur de volumes indépendants.

Le document reste en mémoire pendant la session (120 tracés maximum, historique
limité à 60 actions). Le PNG exporte la vue courante sans interface. Aucune
dépendance ajoutée. Aucun son automatique. Les préférences de réduction des
animations sont respectées au démarrage. Gyroscope : contexte sécurisé et
matériel compatible nécessaires ; le glissement tactile reste disponible.

Le moteur Canvas des matières et le moteur Three.js des effets sont réutilisés.
`src/squiggle/` isole l’interface, les interactions, la projection et les deux vues.
L’expérience CosmoMood précédente reste accessible via **`?cosmomood`**, avec sa
musique et ses univers. Sa documentation historique est conservée ci-dessous.

## Bibliothèque locale d’alphas aquarellés

L’API photo et son code de chargement ont été retirés de Squiggle, ainsi que les
crédits et métadonnées photographiques. Aucune connexion réseau, clé, image
importée ou attribution externe n’est nécessaire pour ces matières.

`pigmentAtlas.js` génère une bibliothèque reproductible de huit textures RGBA :
auréoles, capillarités, granulation, fibres, craquelures, diffusion, projections
et encre sèche. Chaque alpha fait 256 × 256 px ; l’atlas partagé de 2048 × 256 px
est généré une seule fois par session, hors animation. Les bords restent
transparents et organiques, avec réserves de papier et dépôts contrastés.

Les mêmes alphas servent aux empreintes Canvas 2D, aux voiles et aux corps
pigmentaires 3D. Les caches de teintes sont limités, les ancres préparées hors animation et
les mouvements interpolés à partir du temps. En 3D, les tracés sont des surfaces
ouvertes, fines et plissées, sans section fermée ni bouchons : ils restent des
voiles, jamais des corps pleins. Les alphas modulent réellement leur transparence,
avec réserves de papier, bords diffus et dépôts pigmentaires contrastés.
Les ressources portent les noms `GEO_Nappe_Aquarelle_01`,
`Mesh_AudioWave_Organic` et `MAT_Watercolor_NaturalGrain` ; le style du matériau
est identifié `Shader_Organic_Fluid`. `displacementNoise.js` construit une texture
locale reproductible de 128 × 128 px, `TEX_Displace_Noise_Base`, avec des champs
périodiques à plusieurs échelles : déformation lente des voiles, dérive des
pigments, grain naturel et bords humides irréguliers. Elle est générée hors de
l’animation et libérée avec le moteur. Ces noms n’ajoutent pas de source audio.
Le rendu double face permet de les traverser ; l’écriture de profondeur est
désactivée pour conserver leurs superpositions translucides. L’éclairage reste
doux et mat, sans reflet métallique.
Le moteur 3D utilise trois appels de dessin pour les voiles, nappes et poussières ;
plafonds mobiles : 160 nappes, 2 800 particules et 700 segments à quatre bandes,
soit 16 800 sommets maximum. Seules les portions actives des buffers sont mises
à jour. Le point de dessin vise le rayon des voiles pendant le déplacement.
Les ressources GPU sont
libérées à la sortie ; seul l’atlas CPU partagé reste en cache pour la session.

Les tests contrôlent la diversité, les détails, la transparence et la
reproductibilité des huit alphas ; le dessin, le rendu 360° et le PNG fonctionnent
aussi avec les requêtes externes bloquées. Le pilotage FPV, le gyro, la pause et
l’historique restent couverts par les tests du parcours Squiggle.

---

# CosmoMood 360•° — Mon univers émotionnel

Un disque, une à trois émotions, une orb miniature à découvrir puis à traverser.
24 émojis et nuances sont accessibles par trois couronnes de huit autour du disque ;
leurs sélections modifient immédiatement
l’aperçu 3D. Toucher l’orb ouvre le même univers en contemplation ou en voyage.
Un fond noir étoilé accompagne la composition et l’immersion.

La bibliothèque conserve huit repères émotionnels inspirés du modèle de Plutchik,
complétés par seize nuances du langage courant, sans prétention de classification validée,
mais l’interface ne représente plus une roue. Les mélanges ne sont ni classés ni
interprétés automatiquement : c’est une proposition artistique d’externalisation,
pas un instrument psychométrique validé ou un diagnostic.

## Des univers plus différenciés

La sélection reste limitée à trois émotions, même en passant d’une couronne à l’autre.
Les nouvelles nuances incluent sérénité, tendresse, curiosité, fierté, gratitude,
espoir, nostalgie, mélancolie, solitude, fatigue, frustration, inquiétude, ennui,
enthousiasme, émerveillement et apaisement. Chaque entrée possède son vecteur
artistique, sa palette et ses fragments poétiques.

Les volumes varient dans leur étirement et leur diffusion. Quatorze voiles de
lavis ajourés ajoutent des strates aux encres et rubans, avec granulation, auréoles
et diffusion locale liée au son ; sept voiles en qualité réduite. Les matrices
et la géométrie sont réutilisées, sans accumulation au fil du temps.

Le profil partagé influence également le tempo dans une plage douce, le registre
harmonique, la longueur des notes et l’articulation feutrée ou pincée. Cela varie
les univers sans attribuer une musique « correcte » à une émotion.

## Disque et aperçu immersif

- `src/components/EmotionDisc.tsx` : émojis périphériques, limite de trois choix,
  présence réglable et entrée par toucher sur l’orb, aussi accessible au clavier.
- `src/scene/SensoryScene.tsx` en mode `preview` : réutilise les vrais volumes,
  flux et particules avec la même graine ; une caméra extérieure les révèle en miniature.
  Aucun audio ne démarre dans l’aperçu. Il est démonté lorsque l’on entre dans le monde.
- `src/components/CosmicBackdrop.tsx` : fond étoilé Canvas 2D hors de l’orb,
  sans second contexte WebGL, densité et fréquence d’animation bornées.
- `src/scene/StellarField.tsx` : étoiles lointaines dans le monde 3D, avec un budget
  de 1 600 points (800 en qualité réduite) et scintillement très lent, sans flashes.
- Sans WebGL, la miniature devient une représentation simplifiée ; l’entrée et
  l’expérience de secours SVG restent accessibles.

## Pilotage, 360° et composition musicale

- Gyro 360° activé par un bouton explicite, avec permission lorsque le navigateur
  l’exige. HTTPS requis ; faute de capteur ou de permission, le tactile reste utilisable.
  La première mesure calibre le regard sans imposer de rotation. « Recentrer »
  reprend la pose courante comme référence. Les écouteurs sont retirés à la sortie.
- Le geste tactile prime sur le retour vers le centre, qui attend 1,8 seconde
  après le relâchement. La caméra utilise une interpolation de quaternion ;
  la correction spatiale est désactivée en contemplation.
- La musique native Web Audio suit une horloge de 66–76 BPM : accords étendus,
  basse douce, motifs mélodiques transformés et pulsations feutrées. Les notes
  sont anticipées sur l’horloge audio (250 ms), pas déclenchées par les frames.
  La réverbération procédurale, l’écho filtré, la stéréo et la compression sont
  conservés. Plafond de 40 sources simultanées, enveloppes douces et nettoyage à la fin
  de chaque note ; aucun sample externe.
- Les timbres sont produits par `src/audio/organicInstruments.ts` : clavier feutré
  à partiels amortis et légèrement inharmoniques, cordes pincées à retard fractionnaire,
  basse amortie et balais de bruit filtré. Une banque LRU conserve au plus 24 buffers
  mono à 22,05 kHz ; aucun enregistrement externe. Les nappes utilisent une onde
  additive douce, légèrement dédoublée, au lieu d’un triangle fixe.
- Les accords sont tenus sur deux mesures, avec attaques décalées. Les mélodies
  suivent des intervalles voisins, changent d’articulation et laissent des silences.
  La réverbération dispose d’un pré-délai et d’un filtrage des graves pour préserver
  la lisibilité du mixage. Le rendu demeure une synthèse procédurale, pas un enregistrement
  d’instruments acoustiques ; sa qualité perceptive reste à écouter sur matériel réel.
- `src/audio/generativeScore.ts` sépare les règles de composition du graphe audio.
  Les émotions modulent la densité, le filtrage et l’espace sonore, suivant
  des correspondances artistiques.

## Projection, poésie et résonance

L’univers offre une matière ouverte à l’externalisation : les effets n’interprètent
pas la personne et ne simulent aucune amélioration émotionnelle obligatoire.
La poésie orbitale propose au plus deux fragments à la fois, issus d’un corpus
éditable (`src/data/orbitalPoetry.ts`). Ils restent ancrés dans l’espace, apparaissent
et se dissolvent lentement ; une option permet de les masquer. Les associations
avec les familles émotionnelles sont artistiques et non diagnostiques.

`src/audio/audioVisualResonance.ts` relie le moteur sonore et la scène :

- Énergie mesurée par analyseur Web Audio, répartie en graves, corps et détails.
- Événements de notes transmis à leur date audio réelle, dans une file limitée à 32.
- Quatre foyers locaux de résonance : diffusion et vibration des pigments,
  sans pulsation globale de la géométrie ni flash.
- Libérations espacées de 96 pigments, avec un buffer fixe de 576 particules
  (288 en qualité réduite). Aucun ajout permanent d’objets dans la scène.
- Toucher une matière peut appeler une corde douce de l’accord courant,
  au plus une fois toutes les 1,4 seconde, exclusivement lorsque le son est activé.
- Pause et son coupé désactivent les nouveaux déclenchements ; les mouvements
  réduits masquent les libérations et atténuent les réactions locales.

Le gyro 360° arrête désormais le déplacement FPV à l’activation. Les événements
`deviceorientation` et `deviceorientationabsolute` sont pris en charge, en conservant
une seule source de référence. En absence de mesure, un message propose le tactile.
Le regard est calibré à la position courante, sans imposer de déplacement.

## Parcours

- Choisir 1 à 3 émoji-tags autour du disque, avec une présence visuelle réglable.
- Choisir **Contempler** (regard libre sur place) ou **Voyager** (FPV tactile).
- Entrer dans un univers 3D commun : volumes de pigments, flux de lavis, auréoles,
  encres et grains. Les émojis restent autour du disque, pas dans le monde.
- Chaque famille apporte une palette et un vecteur de mouvement. Les couleurs
  des émotions mêlées restent perceptibles ; leurs propriétés se combinent dans
  un seul champ non linéaire. Ces correspondances sont des conventions artistiques.
- En FPV : glisser dirige, maintenir accélère, pincer modifie le champ. Un retour
  doux maintient le voyage près de la création. Basculer en contemplation garde
  le même monde et la même position.
- Pause, interface masquable, mouvements réduits, son facultatif, volume, PNG,
  sauvegarde JSON et liens de partage sont conservés.
- « Autre univers » revient au disque ; aucun panneau de transformation pendant le vol.

`src/data/emotionWheel.ts` centralise les huit familles, leurs couleurs, leurs
opposés et les vecteurs artistiques. `src/components/EmotionDisc.tsx` gère le disque
accessible au toucher et au clavier. Le moteur reste indépendant du rendu :
`src/transduction/engine.ts`. Les données sensorielles précédentes et le format
JSON v1 restent lisibles ; le disque limite les compositions à trois choix.

Les anciens ateliers restent disponibles via leurs paramètres d’URL.

---

## Architecture du moteur réutilisé et historique sensoriel

## Architecture du parcours sensoriel

- `src/data/sensoryWords.ts` : dictionnaire typé conservé pour la compatibilité des projets.
- `src/data/emotionWheel.ts` : la bibliothèque de huit repères émotionnels.
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

La scène utilise cinq ensembles principaux de matières : 44 volumes organiques instanciés,
14 voiles, 22 rubans de lavis, 28 filaments d’encre et 2 400 grains. En qualité réduite :
28 volumes, 7 voiles, 12 rubans, 12 filaments, 1 000 grains et DPR 1 au lieu de 1,5 maximum. Pas de textures externes ni de ray marching. Les buffers
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
