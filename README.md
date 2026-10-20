# Ciel en résonance •° — Sculpture 360°

**Entrer dans l’atelier 3D → choisir une brosse → toucher pour sculpter en naviguant.**

Le disque 2D et la révélation ne font plus partie du parcours. La caméra est en
retrait du point de sculpture : la brosse dépose devant elle, à une distance
réglable. Les gestes pilotent toujours le vol, même pendant la sculpture.
Le contact avec le canevas active immédiatement le dépôt. Le relâchement,
l’annulation du geste ou la perte de capture le terminent. Le voyage automatique
continue sans déposer tant que le canevas n’est pas touché. Les traces restent ancrées dans le monde lorsqu’on
regarde ailleurs ou qu’on s’éloigne.

Douze brosses émojis conservent leurs signatures : vagues bleues, flammes et braises,
bulles, cristaux, matières minérales, plumes, brumes, vibrations, spirales, fibres,
pousses et rayons. Les textures pigmentaires et la réponse spectrale locale sont
conservées. La musique Gravity commence à l’entrée, si disponible. Aucun synthétiseur
ni backend ajouté.

## Navigation et outils

Glisser tourne le vol ; maintenir plus de 280 ms accélère progressivement. Relâcher
ralentit ou reprend le voyage automatique s’il était actif. Le gyro oriente le
regard, avec alternative tactile. Une attraction douce conserve la proximité de
l’œuvre. Le même contact dessine et pilote, sans bouton de sculpture intermédiaire.
Toucher un outil ne dépose aucune matière.

La palette et les contrôles sont placés dans une barre inférieure pliable :
Voyage, annulation, musique, gyro et casque VR. Les réglages de taille, opacité et
distance de dépôt se déplient séparément. L’accueil conserve la session ; effacer
retire explicitement l’œuvre. Les captures et le parcours 2D ne sont pas proposés.

## Architecture et performance

- `WatercolorWorkshop.jsx` : atelier 3D, palette, dépôt au contact, VR et musique.
- `createSpatialEmojiPainter.js` : échantillonnage du point devant la caméra, aperçu
  immédiat, matière en cours et matière finalisée.
- `spatialBrushFrame.js` : projection sur la trajectoire 3D réellement parcourue.
- `emojiPainting.js` : les douze signatures procédurales réutilisées.
- `createPictorialLandscape.js` / `pictorialShaders.js` : pigments, diffusion,
  gonflement local et particules audioréactives dans des lots GPU partagés.
- `createPanoramaJourney.js` / `createCameraRig.js` : vol, accélération, retour et regard.

Le dépôt est échantillonné par distance. Chaque portion conserve au maximum 256
points, puis démarre une nouvelle portion continue, dans la limite de 80 portions.
Le guide immédiat réutilise un buffer ; les détails de la matière en cours sont
reconstruits au plus à 20 Hz. La matière validée est regroupée dans deux lots, la
matière en cours dans deux autres. Les textures restent partagées et sont libérées
à la destruction. Aucun dépôt ne relie un saut de caméra ou deux sessions séparées.
Les anciens modules de dessin restent dans le dépôt sans être montés dans l’interface.
Aucune analyse émotionnelle ni transmission des œuvres.

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
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/watercolor-workshop.spec.js tests/spatial-workshop.spec.js
```

Les contrôles couvrent l’entrée directe en 3D, l’absence d’éditeur 2D, le dépôt
pendant le vol tactile et automatique, l’arrêt indépendant de la sculpture,
l’annulation, la conservation de la session, les douze signatures, l’ancrage
spatial et la libération des ressources. Les tests réutilisables des anciens
moteurs et des matières sont conservés. Les anciennes suites de parcours retirés
ne constituent pas la validation du parcours courant. Le confort et la fluidité
sur téléphone physique restent à vérifier.

## Une interface qui s’efface pendant le geste

`useSculptTools` masque les outils après 140 ms de contact et les rappelle 850 ms
après le relâchement. Le mode plié est conservé. Un rappel compact affiche la brosse
sélectionnée et permet de rouvrir les outils. L’opacité de repos est de 0,74 ; le
menu redevient opaque au toucher, au survol ou au focus clavier. Les réglages au
clavier restent visibles. Les cibles mesurent au moins 44 px. Le menu caché est
inerte ; Échap le rappelle. Les transitions respectent le mouvement réduit.

## Casque VR

Le pictogramme casque ouvre une session WebXR `immersive-vr` depuis le geste de
l’utilisateur. La gâchette d’un contrôleur (`selectstart` / `selectend`) joue le rôle
du contact tactile pour déposer la matière. La fin de session coupe le dépôt et
revient à la caméra panorama. Le bouton permet également de quitter la VR. Les
refus d’autorisation et les appareils incompatibles affichent une erreur sans
bloquer l’atelier. La VR requiert HTTPS, un navigateur et un casque compatibles ;
le test matériel en casque reste à réaliser.

## Résonance fluide

`createPigmentEnvelope` applique deux enveloppes successives à chaque bande
spectrale : la matière prend progressivement son ampleur puis se relâche plus
lentement. Les accents restent faibles et lissés. Les ondes utilisent une vitesse
stable ; la musique agit sur leur ampleur, la diffusion et les pigments plutôt
que sur une phase multipliée directement par le niveau sonore.

Les coordonnées de matière, la phase du geste et les graines des particules sont
stables pendant l’allongement du tracé. Les enveloppes survivent aux reconstructions
et sont transmises de l’aperçu à la matière finalisée. Le repère de la brosse
transporte son orientation depuis le point précédent pour limiter les retournements.
Les tests vérifient les impacts alternés rapides, le relâchement progressif,
l’indépendance des bandes et la continuité des phases/enveloppes à la reconstruction.
