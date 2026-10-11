# Volupt360 — NID SONORE•°

Un voyage en drone dans une œuvre aquarelle étendue en trois dimensions. La musique anime un pinceau qui avance dans l’espace et laisse des matières dans son sillage ; la caméra accompagne ce mouvement, anticipe les courbes et révèle l’œuvre dans les moments calmes. React + Vite + Three.js, sans serveur applicatif ni service audio externe.

## L’expérience

**Trois vues en haut :**

- **FPV drone** : poursuite amortie du pinceau dans son sillage, décalage latéral, anticipation des virages et recul quand le son se calme. La position et le regard suivent le tracé XYZ.
- **TPV** : vue extérieure cadrée sur les dimensions réelles de l’œuvre, adaptée aux écrans horizontaux et verticaux.
- **FPV 360° gyro** : point de vue central et orientation de l’appareil, calibrée à l’activation. Les appareils qui exigent une autorisation affichent leur demande native. Si le capteur est absent ou refusé, le glissement permet toujours l’exploration panoramique.

**Une seule palette, six brosses :** Voiles (rubans translucides), Falaises (strates minérales), Corolles (pétales nervurés), Filaments (encre fine), Brumes (pigments diffus), Lagons (lentilles fluides). Leur géométrie, texture, épaisseur, couleur et opacité varient avec l’énergie et le spectre du son. Les rubans se construisent progressivement sur des courbes XYZ reliées, avec une orientation continue même dans les montées et les plongées. Les brumes et lentilles se déposent le long de ce voyage. Le chemin continue à se développer quand une boucle musicale se répète.

**Appui long sur une brosse :** maintenir environ une demi-seconde puis relâcher pour ouvrir l’import d’image. Au clavier, utiliser **Majuscule + Entrée**. L’image est transformée localement en masque alpha : seuil automatique de luminance, contours Sobel, conservation de la transparence et interprétation du fond clair ou sombre. Le masque module le pigment et découpe la transparence des surfaces 3D. Chaque brosse conserve sa propre texture, applicable aux traits déjà présents et aux traits futurs. Un aperçu apparaît dans sa vignette ; un nouvel import remplace son masque. Les textures restent en mémoire pendant la session, y compris lors d’un changement de morceau ; elles ne sont pas sauvegardées entre rechargements.

**Une piste en bas :** importer un MP3 ou un autre format audio décodable par le navigateur, puis sélectionner une phrase délimitée par les marqueurs ou **MP3 entier**. Lecture/pause reste intégré à la piste. Le scratch, le micro, les réglages et la peinture tactile ont été retirés.

Le fichier est analysé localement : estimation du rythme par autocorrélation des variations d’énergie, phrases d’environ quatre mesures et ajustement des limites vers les moments plus calmes. Les morceaux sans rythme net utilisent un découpage régulier. Les longs morceaux utilisent des phrases plus longues pour garder au maximum environ 32 régions lisibles. Ce découpage est une estimation, pas une reconnaissance garantie des mesures musicales. Les pistes très courtes forment une seule boucle.

La répétition utilise les limites natives de `AudioBufferSourceNode`, indépendamment de la fréquence du rendu 3D. Changer de boucle poursuit la lecture si elle était active, ou reste en pause si elle était arrêtée. Une nouvelle importation remplace les anciennes peintures musicales. Les pistes restent locales ; aucun fichier n’est téléversé.

**Le glissement horizontal tourne uniquement la sculpture à 360°** : il ne crée ni peinture ni déformation. Le trajet du drone se recale sur les positions tournées du paysage. La rotation se fait autour du centre réel de l’œuvre et le drone recalcule son suivi dans les coordonnées tournées. Avant l’import, une étude pâle présente une trajectoire ouverte en trois dimensions. Les peintures musicales s’estompent progressivement et leur nombre est plafonné pour limiter les ressources.

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

Les tests couvrent le découpage rythmique et silencieux, les six brosses, les trois vues, la rotation sans peinture tactile, la peinture audio, les limites de boucle, la pause, le morceau entier, un fichier invalide, les autorisations du gyroscope, l’interface mobile, le déplacement XYZ et le suivi du drone, les appuis longs sur les six brosses et les textures invalides ou transparentes. Ils utilisent une fixture WAV locale et le rendu logiciel WebGL. La précision musicale du découpage sur vos propres morceaux et le gyroscope physique nécessitent une vérification sur les appareils visés.

## Vercel

Importer `pierkiroule/Volupt360` dans Vercel, avec le répertoire contenant `package.json` comme racine. Choisir **Vite**, `npm ci` pour l’installation, `npm run build` pour la compilation et `dist` pour la sortie. `vercel.json` fixe le framework, le build et la sortie.

Aucun secret ou variable d’environnement n’est requis. Vercel fournit HTTPS pour le gyroscope. Une seule page, sans routeur : aucune réécriture SPA supplémentaire n’est nécessaire. Aucun déploiement Vercel n’a été exécuté pendant cette refonte.
