# echohypnosis — L’Oizo échohypnotique

Choisissez **Le Souffle**, **Les Marées** ou **La Ramure**, trois expériences avec six brosses chacune. Un premier son organique est généré localement, puis les traces composent progressivement une musique spatialisée qui influence à son tour les visuels. Les trois univers possèdent trois familles de timbres harmonisés. Six planètes aquarellées se déplacent dans chaque univers. Un double tap sélectionne leur brosse ; un halo bleu entoure la planète active, sans pads ni menu. Un appui long de 450 ms sur le canevas fait tracer l’oizo avec la dernière brosse choisie, le long de son vol continu. Le doigt guide uniquement l’orientation ; il ne dessine jamais. Relâcher arrête ce dépôt. En FPV, glisser sur le canevas infléchit l’orientation relative de l’oizo : vers le haut pour monter, vers le bas pour descendre, vers la droite ou la gauche pour tourner. La réponse est progressive et conserve une inertie douce au relâchement. Le réseau vocal préfabriqué est désactivé. Les positions réellement déposées constituent maintenant une mémoire légère ; le vol détecte ses retrouvailles en 3D avec les anciens passages. Les rencontres rappellent maintenant les motifs sonores des traces. Les vocaux restent une option rare, désactivée par défaut. Voir [le périmètre, le débogage et le retour arrière](docs/trace-memory.md).

Voir [l’architecture et les vérifications](docs/echohypnosis.md).

L’interface propose directement six pads par univers, sans outil de textures ni menu de réglage. Les textures automatiques des brosses d’origine sont conservées. La musique générée est incluse dans le mix des vidéodios. Aucun vocal n’est associé à une brosse et aucun mot n’est déposé dans la sculpture. Aucun import musical libre dans ce parcours : l’univers fournit sa musique.

Deux boutons discrets **Zoom − / +** restent visibles en bas à droite. La vue **Photo** permet de tourner et zoomer la sculpture, de télécharger une photo en **PNG HD jusqu’à 2 560 pixels**, ou une **vidéodio FPV de dix secondes avec son audio synchronisé**. Photos et vidéos restent locales. Voir [le fonctionnement et les limites](docs/videodio.md).

Désactivation : `VITE_ENABLE_SONOIZO=false npm run build`, puis redéployer. L’ancien atelier MP3 est aussi accessible à `/?atelier=mp3` pour les contrôles de régression. Voir [l’architecture et les vérifications](docs/sonoizo.md). Le moteur des douze brosses, les textures et leurs optimisations sont conservés.

## Atelier MP3 existant

Un voyage en drone dans une œuvre aquarelle étendue en trois dimensions. La musique anime un pinceau qui avance dans l’espace et laisse des matières dans son sillage ; la caméra accompagne ce mouvement, anticipe les courbes et révèle l’œuvre dans les moments calmes. React + Vite + Three.js, sans serveur applicatif ni service audio externe.

## L’expérience

**Deux vues en haut :**

- **FPV drone** : poursuite amortie du pinceau dans son sillage, décalage latéral, anticipation des virages et recul quand le son se calme. Le slider **Distance** passe du sillage proche à un cadrage global adapté au format de l’écran.
- **FPV 360° gyro** : point de vue central et orientation de l’appareil, calibrée à l’activation. Les appareils qui exigent une autorisation affichent leur demande native. Si le capteur est absent ou refusé, le glissement permet toujours l’exploration panoramique.

**Rendu de la vue :** un étalonnage fixe renforce les pigments dans les deux vues : courbe de contraste ancrée sur le papier à 2,20, saturation 1,45 et seuil d’encre léger à 8 %. Les pigments et la granulation ont davantage de présence, tout en préservant les hautes lumières du papier, les transparences des bulles et les nuances sombres. Le traitement reste limité à la scène ; aucun outil de réglage supplémentaire n’apparaît dans l’interface.

**Les douze brosses d’origine :** Voiles (rubans translucides), Falaises (strates minérales), Corolles (pétales nervurés), Filaments (encre fine), Encres (taches noires irrégulières), Éclats (éclaboussures et satellites d’encre). Bulles sème des sphères translucides aux reflets multicolores ; Aurore tisse trois voiles torsadés et irisés ; Calligraphie alterne pleins et déliés dans des arabesques en trois dimensions. Leur géométrie, texture, épaisseur, couleur et opacité varient avec l’énergie et le spectre du son. Les rubans se construisent progressivement sur des courbes XYZ reliées, avec une orientation continue même dans les montées et les plongées. Les taches et éclaboussures se déposent à différentes échelles le long du voyage. Network tisse des nœuds cristallins reliés dans l’espace, Dilution étale des lavis à auréoles et Echo dédouble le mouvement en trois rubans décalés dans le temps. Le chemin tisse des orbites déformées autour d’un centre fixe, avec des rayons et des altitudes variables. Le centre reste dégagé pour la contemplation panoramique. Le chemin continue à évoluer quand une boucle musicale se répète. Les pigments diffusent et se fragmentent lentement, puis sèchent ; l’évolution est suspendue avec la musique.

**Composition et respiration :** des régions de densité différente alternent avec deux fenêtres dégagées dans l’enveloppe. Le pinceau cesse d’y déposer du pigment et reprend sans relier les deux bords. Les passages successifs revisitent les régions à des rayons et hauteurs variables. Chaque morceau détermine une gamme de trois couleurs à partir de sa waveform et de son tempo : dominante, secondaire et accent rare. Les encres gardent leurs noirs.

**Drone musical :** le mouvement alterne suivi, passage latéral et contemplation sur des phrases spatiales modulées par le son. Les transitions restent progressives et le slider de distance conserve la priorité sur la proximité. La vue gyro reste indépendante de cette mise en scène.

**Matières et mémoire :** les lavis sèchent lentement, les dépôts minéraux plus vite et l’encre se stabilise rapidement. La diffusion laisse place aux bords pigmentés et à la granulation. Les éclaboussures ponctuent surtout les variations sonores. Certaines formes structurantes persistent plus longtemps ; les traces autour des fenêtres dégagées se dissolvent plus vite. L’effacement demeure progressif et irréversible.

**Textures :** le bouton Texture dans Mes sons propose **Mycélium, Cellules, Nervures, Encre éclatée et Écailles**. Dans l’atelier MP3, maintenir une brosse environ une demi-seconde ou utiliser **Majuscule + Entrée** ouvre cette même palette. Ces cinq motifs RGBA contrastés remplacent le masque des traits existants et futurs ; aucun fichier image ne peut être sélectionné. Les textures restent locales à la session.

**Une piste en bas :** importer un MP3 ou un autre format audio décodable par le navigateur, puis sélectionner une phrase délimitée par les marqueurs ou **MP3 entier**. Lecture/pause reste intégré à la piste. Le scratch, le micro et la peinture tactile ont été retirés.

Le fichier est analysé localement : estimation du rythme par autocorrélation des variations d’énergie, phrases d’environ quatre mesures et ajustement des limites vers les moments plus calmes. Les morceaux sans rythme net utilisent un découpage régulier. Les longs morceaux utilisent des phrases plus longues pour garder au maximum environ 32 régions lisibles. Ce découpage est une estimation, pas une reconnaissance garantie des mesures musicales. Les pistes très courtes forment une seule boucle.

La répétition utilise les limites natives de `AudioBufferSourceNode`, indépendamment de la fréquence du rendu 3D. Changer de boucle poursuit la lecture si elle était active, ou reste en pause si elle était arrêtée. Une nouvelle importation remplace les anciennes peintures musicales. Les pistes restent locales ; aucun fichier n’est téléversé.

**Le glissement horizontal tourne uniquement la sculpture à 360°** : il ne crée ni peinture ni déformation. Le trajet du drone se recale sur les positions tournées du paysage. La rotation se fait autour du centre fixe de la scène et le drone recalcule son suivi dans les coordonnées tournées. Avant l’import, une étude pâle présente une enveloppe orbitale en trois dimensions. Les peintures musicales s’estompent progressivement. La densité locale et la quantité totale accélèrent la dissolution des dépôts anciens, tandis que les gestes récents restent lisibles. Une limite de ressources demeure en dernier recours.

## Matières génératives optionnelles

La version consolidée conserve les douze brosses, les deux vues caméra, les boucles audio et le choix de textures par appui long. Un générateur Canvas aquarelle fournit un masque propre à chacune des douze brosses, sans changer les gestes ou le pipeline audio.

Il est **activé pour les douze brosses** : `ENABLE_GENERATIVE_TEXTURES = true` dans `src/engine/generativeConfig.js`. Importer un morceau et choisir une brosse pour voir sa matière générée. Revenir à `false` puis recompiler/recharger pour le désactiver. Vingt-quatre masques déterministes (deux variantes par brosse) sont préparés à l’initialisation, avec cache borné et références libérées au retrait des tracés. Aucune génération de pixels pendant le rendu.

Des surprises rares accompagnent certains accents sonores : halos ambrés, constellations de pigment et petites dentelles. Elles restent locales, ne clignotent pas et n’ajoutent aucune géométrie.

Voir [l’audit, l’architecture et les limites](docs/generative-materials.md). L’atelier MP3 conserve ses boucles ; l’atelier principal ajoute le microphone, les pads et l’export PNG HD.

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
- `src/engine/brushes.js` : douze géométries de traits, buffers progressifs, matières aquarelle et masques alpha.
- `src/engine/createPainterFlight.js` : phrases spatiales reliées et orientation continue du pinceau.
- `src/engine/createCameraRig.js` : poursuite du pinceau, cadrage global, rotation et orientation gyroscopique.
- `src/engine/predefinedTextures.js` : cinq masques alpha organiques, sans import d’images.
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

Les tests couvrent le découpage rythmique et silencieux, les douze brosses, les deux vues, la rotation sans peinture tactile, la peinture audio, les limites de boucle, la pause, le morceau entier, un fichier invalide, les autorisations du gyroscope, l’interface mobile, le déplacement XYZ et le suivi du drone, les appuis longs sur les douze brosses et les cinq textures alpha et leurs régions transparentes. Ils utilisent une fixture WAV locale et le rendu logiciel WebGL. La précision musicale du découpage sur vos propres morceaux et le gyroscope physique nécessitent une vérification sur les appareils visés.

## Vercel

Importer `pierkiroule/Volupt360` dans Vercel, avec le répertoire contenant `package.json` comme racine. Choisir **Vite**, `npm ci` pour l’installation, `npm run build` pour la compilation et `dist` pour la sortie. `vercel.json` fixe le framework, le build et la sortie.

Aucun secret ou variable d’environnement n’est requis. Vercel fournit HTTPS pour le gyroscope. Une seule page, sans routeur : aucune réécriture SPA supplémentaire n’est nécessaire. Aucun déploiement Vercel n’a été exécuté pendant cette refonte.

La persistance de base des traces passe de 150 à 200 secondes (hors pression de densité), avec une dissolution étendue de 35 à 48 secondes. La surcharge locale continue à accélérer l’effacement ; la limite de 80 tracés reste en place. Chaque univers affiche six pads discrets sur une ligne horizontale.

Chaque univers conserve ses quatre brosses d’origine et reçoit deux matières de particules : **Plumes / Lucioles** dans Le Souffle, **Feuilles / Filaments libres** dans Les Marées, **Racines / Hachures** dans La Ramure. Leurs motifs sont procéduraux, colorés, animés et déposés par l’oizo, y compris à l’appui long.

L’ambiance musicale est réellement analysée : les basses font respirer les pigments et l’ampleur des particules, les variations déclenchent des accents lumineux, et les aigus accélèrent les mouvements. Une adaptation lente du niveau rend les musiques calmes lisibles sans augmenter leur volume. Les voix complètent cette réponse. La musique module aussi les traces déjà présentes et les cordes proches de l’oizo ; elle ne déclenche pas de brosse seule.

Les mondes sonores **Source, Rivière et Abysses** sont entièrement procéduraux : gouttes résonantes, bulles, courants, écume et réverbération calculée en AudioWorklet. `?sound=legacy` permet de comparer avec la synthèse précédente.

Voir [le fonctionnement, les tests et les limites de l’instrument](docs/echo-instrument.md). `?instrument=off` restaure le parcours musical MP3 précédent pour comparaison.

Les trois compositions **ÉTHER, ABYSSE et MÉMOIRE** suivent maintenant des horloges indépendantes et se mélangent par glissement entre les sphères. Voir [les règles, les contrôles ÉCHO/HYPNOS et les limites](docs/ambient-universes.md).

**18 matières aquarellées fixes** : six planètes par univers remplacent le menu des brosses. Un double tap sur une planète change la matière ; maintenir le canevas fait peindre l’oizo. Aucun import ni modification des textures. Voir [les corps aquarellés](docs/celestial-brushes.md).
