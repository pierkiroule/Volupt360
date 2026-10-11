# Volupt360 — NID SONORE•°

Un voyage en drone dans une œuvre aquarelle étendue en trois dimensions. La musique anime un pinceau qui avance dans l’espace et laisse des matières dans son sillage ; la caméra accompagne ce mouvement, anticipe les courbes et révèle l’œuvre dans les moments calmes. React + Vite + Three.js, sans serveur applicatif ni service audio externe.

## L’expérience

**Deux vues en haut :**

- **FPV drone** : poursuite amortie du pinceau dans son sillage, décalage latéral, anticipation des virages et recul quand le son se calme. Le slider **Distance** passe du sillage proche à un cadrage global adapté au format de l’écran.
- **FPV 360° gyro** : point de vue central et orientation de l’appareil, calibrée à l’activation. Les appareils qui exigent une autorisation affichent leur demande native. Si le capteur est absent ou refusé, le glissement permet toujours l’exploration panoramique.

**Rendu de la vue :** le bouton **Rendu** ouvre Contraste, Saturation et Seuil d’encre. Les réglages persistent au passage entre drone et gyro ; **Naturel** rétablit les valeurs neutres. Le seuil se mélange progressivement à l’aquarelle et les hautes lumières du papier sont préservées. Une seule passe GPU applique ces effets à la scène, sans filtrer l’interface. Avec les valeurs neutres, elle est contournée.

**Une seule palette, six brosses :** Voiles (rubans translucides), Falaises (strates minérales), Corolles (pétales nervurés), Filaments (encre fine), Encres (taches noires irrégulières), Éclats (éclaboussures et satellites d’encre). Leur géométrie, texture, épaisseur, couleur et opacité varient avec l’énergie et le spectre du son. Les rubans se construisent progressivement sur des courbes XYZ reliées, avec une orientation continue même dans les montées et les plongées. Les taches et éclaboussures se déposent à différentes échelles le long du voyage. Le chemin tisse des orbites déformées autour d’un centre fixe, avec des rayons et des altitudes variables. Le centre reste dégagé pour la contemplation panoramique. Le chemin continue à évoluer quand une boucle musicale se répète. Les pigments diffusent et se fragmentent lentement, puis sèchent ; l’évolution est suspendue avec la musique.

**Composition et respiration :** des régions de densité différente alternent avec deux fenêtres dégagées dans l’enveloppe. Le pinceau cesse d’y déposer du pigment et reprend sans relier les deux bords. Les passages successifs revisitent les régions à des rayons et hauteurs variables. Chaque morceau détermine une gamme de trois couleurs à partir de sa waveform et de son tempo : dominante, secondaire et accent rare. Les encres gardent leurs noirs.

**Drone musical :** le mouvement alterne suivi, passage latéral et contemplation sur des phrases spatiales modulées par le son. Les transitions restent progressives et le slider de distance conserve la priorité sur la proximité. La vue gyro reste indépendante de cette mise en scène.

**Matières et mémoire :** les lavis sèchent lentement, les dépôts minéraux plus vite et l’encre se stabilise rapidement. La diffusion laisse place aux bords pigmentés et à la granulation. Les éclaboussures ponctuent surtout les variations sonores. Certaines formes structurantes persistent plus longtemps ; les traces autour des fenêtres dégagées se dissolvent plus vite. L’effacement demeure progressif et irréversible.

**Appui long sur une brosse :** maintenir environ une demi-seconde puis relâcher pour ouvrir l’import d’image. Au clavier, utiliser **Majuscule + Entrée**. L’image est transformée localement en masque alpha : seuil automatique de luminance, contours Sobel, conservation de la transparence et interprétation du fond clair ou sombre. Le masque module le pigment et découpe la transparence des surfaces 3D. Chaque brosse conserve sa propre texture, applicable aux traits déjà présents et aux traits futurs. Un aperçu apparaît dans sa vignette ; un nouvel import remplace son masque. Les textures restent en mémoire pendant la session, y compris lors d’un changement de morceau ; elles ne sont pas sauvegardées entre rechargements.

**Une piste en bas :** importer un MP3 ou un autre format audio décodable par le navigateur, puis sélectionner une phrase délimitée par les marqueurs ou **MP3 entier**. Lecture/pause reste intégré à la piste. Le scratch, le micro et la peinture tactile ont été retirés.

Le fichier est analysé localement : estimation du rythme par autocorrélation des variations d’énergie, phrases d’environ quatre mesures et ajustement des limites vers les moments plus calmes. Les morceaux sans rythme net utilisent un découpage régulier. Les longs morceaux utilisent des phrases plus longues pour garder au maximum environ 32 régions lisibles. Ce découpage est une estimation, pas une reconnaissance garantie des mesures musicales. Les pistes très courtes forment une seule boucle.

La répétition utilise les limites natives de `AudioBufferSourceNode`, indépendamment de la fréquence du rendu 3D. Changer de boucle poursuit la lecture si elle était active, ou reste en pause si elle était arrêtée. Une nouvelle importation remplace les anciennes peintures musicales. Les pistes restent locales ; aucun fichier n’est téléversé.

**Le glissement horizontal tourne uniquement la sculpture à 360°** : il ne crée ni peinture ni déformation. Le trajet du drone se recale sur les positions tournées du paysage. La rotation se fait autour du centre fixe de la scène et le drone recalcule son suivi dans les coordonnées tournées. Avant l’import, une étude pâle présente une enveloppe orbitale en trois dimensions. Les peintures musicales s’estompent progressivement. La densité locale et la quantité totale accélèrent la dissolution des dépôts anciens, tandis que les gestes récents restent lisibles. Une limite de ressources demeure en dernier recours.

## Matières génératives optionnelles

La version consolidée conserve les six brosses, les deux vues caméra, les boucles audio et l’import de textures par appui long. Un générateur Canvas aquarelle fournit un masque propre à chacune des six brosses, sans changer les gestes ou le pipeline audio.

Il est **activé pour les six brosses** : `ENABLE_GENERATIVE_TEXTURES = true` dans `src/engine/generativeConfig.js`. Importer un morceau et choisir une brosse pour voir sa matière générée. Une image importée par appui long a priorité, y compris sur les traces déjà présentes. Revenir à `false` puis recompiler/recharger pour le désactiver. Douze masques déterministes (deux variantes par brosse) sont préparés à l’initialisation, avec cache borné et références libérées au retrait des tracés. Aucune génération de pixels pendant le rendu.

Des surprises rares accompagnent certains accents sonores : halos ambrés, constellations de pigment et petites dentelles. Elles restent locales, ne clignotent pas et n’ajoutent aucune géométrie.

Voir [l’audit, l’architecture et les limites](docs/generative-materials.md). Le dépôt actuel ne propose pas microphone, scratch, peinture par tap ni export PNG.

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

## Structure

- `src/components/` : vues caméra, palette et piste audio avec waveform et marqueurs, entièrement pilotées par React.
- `src/App.jsx` : état de l’interface, import audio et cycle de vie des moteurs.
- `src/audio/analyzeLoops.js` : estimation rythmique, découpage et waveform.
- `src/audio/createLoopPlayer.js` : lecture, pause et limites natives de boucle.
- `src/audio/audioGraph.js` : analyse du spectre et de l’énergie.
- `src/engine/artDirection.js` : palette par morceau, densité spatiale et intentions du drone.
- `src/engine/dissolvePigment.js` : dissolution selon densité, importance et ouvertures.
- `src/engine/createSoundNest.js` : construction progressive du tracé spatial et peinture réactive.
- `src/engine/brushes.js` : six géométries de traits, buffers progressifs, matières aquarelle et masques alpha.
- `src/engine/createPainterFlight.js` : phrases spatiales reliées et orientation continue du pinceau.
- `src/engine/createCameraRig.js` : poursuite du pinceau, cadrage global, rotation et orientation gyroscopique.
- `src/engine/importBrushTexture.js` : décodage local des images, seuil et contours.
- `src/engine/shaders/` : shaders GLSL importés par Vite, sans CDN à l’exécution.

Le démontage arrête le rendu et l’audio, retire les écouteurs de pointeur et de capteur et libère les ressources WebGL. Les imports successifs ignorent les résultats de décodage devenus obsolètes.

## Tests

```sh
npx playwright install chromium
npm test
```

Dans cet environnement cloud, Chromium est déjà installé :

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test
```

Les tests couvrent le découpage rythmique et silencieux, les six brosses, les deux vues, la rotation sans peinture tactile, la peinture audio, les limites de boucle, la pause, le morceau entier, un fichier invalide, les autorisations du gyroscope, l’interface mobile, le déplacement XYZ et le suivi du drone, les appuis longs sur les six brosses et les textures invalides ou transparentes. Ils utilisent une fixture WAV locale et le rendu logiciel WebGL. La précision musicale du découpage sur vos propres morceaux et le gyroscope physique nécessitent une vérification sur les appareils visés.

## Vercel

Importer `pierkiroule/Volupt360` dans Vercel, avec le répertoire contenant `package.json` comme racine. Choisir **Vite**, `npm ci` pour l’installation, `npm run build` pour la compilation et `dist` pour la sortie. `vercel.json` fixe le framework, le build et la sortie.

Aucun secret ou variable d’environnement n’est requis. Vercel fournit HTTPS pour le gyroscope. Une seule page, sans routeur : aucune réécriture SPA supplémentaire n’est nécessaire. Aucun déploiement Vercel n’a été exécuté pendant cette refonte.
