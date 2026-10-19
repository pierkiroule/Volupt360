# Paysage sensoriel 360•° — Mon monde en résonance

**Composer sur un disque → relier → révéler → contempler ou voyager.**

Douze émojis sensoriels entourent le disque : bulles, ondes, chaleur, fraîcheur, densité, légèreté, brume, vibration, tourbillon, tension, élan et rayonnement. Le thérapeute peut compléter « Décore ton ciel avec les émojis qui résonnent avec… » à l’accueil ou dans la composition. La consigne reste locale à la session et ne sert à aucune analyse.

Glisser un émoji de la couronne vers le disque le dépose. Les objets restent déplaçables ; taille et opacité s’appliquent à l’objet sélectionné ou aux prochains dépôts. Faire se toucher deux objets crée ou retire leur lien. Une paire ne peut changer qu’une fois par déplacement ; séparer des objets déjà en contact ne supprime pas leur lien. Pour délier, séparer puis faire une nouvelle rencontre. Annulation, suppression et manipulation au clavier sont disponibles. Un clic sur la palette puis sur le disque constitue une alternative au glissement ; Entrée dépose au centre, les flèches déplacent un objet et Suppr le retire.

Le modèle indépendant conserve les positions normalisées, tailles, opacités et paires de liens. Le paysage 3D utilise ces mêmes données : volumes sphériques translucides portant une face émoji orientée vers le regard, particules locales et liens courbes parcourus de flux. Il ne s’agit pas de modèles volumétriques sculptés de chaque pictogramme. Les familles sensorielles disposent de mouvements et de bandes de réponse musicale distincts. La musique Gravity et la réactivité sont réservées au monde 3D ; le retour à la composition coupe la musique et conserve le réseau.

Le voyage suit les orbites et traversées du moteur existant, sans pilotage. Le gyroscope oriente le regard ; le glissement reste disponible en secours. Aucune interprétation émotionnelle, aucun diagnostic, aucun backend et aucune transmission du dessin ou de la consigne.

## Matière et mots flottants

Le paysage 3D accueille jusqu’à 18 nappes aquarellées instanciées, ancrées sur les émojis et les liens. Deux textures procédurales partagées simulent lavis, grain et dépôts pigmentaires ; leur ampleur et leur présence suivent les réponses audio locales. Les réserves de blanc et la lisibilité des émojis restent prioritaires.

Trois emplacements réutilisables font émerger des mots sensoriels et, plus rarement, des métaphores « c’est comme… ». Les phrases dépendent uniquement des symboles présents et restent des propositions poétiques. Elles dérivent dans le monde, apparaissent en douceur et disparaissent après quelques secondes. Les textes sont préparés lors de la révélation, jamais rasterisés dans la boucle de rendu ; aucune texture supplémentaire n’est créée à chaque apparition. La composition 2D reste inchangée.

## Modules

- `sensoryEmojiCatalog.js` : émojis, couleurs, signatures de mouvement et bandes audio.
- `sensoryGraph.js` : ajout, déplacement contraint au disque, contacts et liens.
- `SensoryDisc.jsx` : composition tactile, couronne, consigne et historique.
- `createSensoryNetwork.js` : objets 3D, buffers partagés de particules et flux, nettoyage GPU.
- `sensoryLanguage.js` : lexique sensoriel et métaphores modifiables.
- `createSensoryAtmosphere.js` : nappes texturées, cycle des mots et cache de textes borné.
- `WatercolorWorkshop.jsx` : parcours composition / contemplation et musique.

Le modèle est plafonné à 48 objets et 96 liens, l’historique à 60 opérations. Les particules et les flux utilisent quatre lots GPU ; les textures d’émojis sont partagées par symbole. Le rendu 3D est suspendu en composition. Les modules de peinture précédents restent disponibles dans le dépôt pour préserver les parcours historiques.

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
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/watercolor-workshop.spec.js
```

Les contrôles ciblent les contacts sans rebond, le glisser-déposer, la taille et l’opacité, la consigne, l’aller-retour 2D / 3D, la réaction locale à l’audio, le voyage et le nettoyage GPU. Le confort, le gyroscope et le rendu sur téléphone physique restent à valider. L’apparence native des émojis dépend des polices de l’appareil.

The sensory 3D scene also includes `createSensoryCurrents`: drifting pigment seeds
and unfurling, fading ink streamers. Two shared GPU batches serve at most 24
representative nodes (3,456 seeds and 144 streamers). Motion and lifecycles run
in shaders; only anchors and smoothed local audio energy are uploaded each frame.
No textures or geometries are allocated during animation. Clearing or leaving
the world releases the field geometry and materials through the network lifecycle.
