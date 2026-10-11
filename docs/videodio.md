# Vidéodios de L’Oizodio•°

La troisième vue, **Photo**, arrête le vol, les dépôts, l’évolution des matières et les sons joués. Glisser permet de tourner la sculpture sur les axes horizontal et vertical ; pincement, molette ou boutons +/− règlent le zoom. Quitter cette vue reprend le vol sans effacer la sculpture.

**Créer ma vidéodio** encode localement une vidéo de dix secondes : quatre secondes du cadrage choisi, silencieuses, puis six secondes du dernier voyage enregistré avec son audio. Le retour animé conserve la vue utilisée pendant ce voyage ; le nouveau cadrage s’applique aux quatre premières secondes. Si l’application vient d’ouvrir et possède moins de six secondes d’historique, la première image disponible complète le début et les parties audio manquantes restent silencieuses. Jouer au moins six secondes avant de passer en Photo produit un retour complet.

Après création, **Télécharger ma vidéodio** conserve un fichier dans les téléchargements du visiteur. On peut changer le cadrage et exporter à nouveau le même voyage. Aucun upload, backend ni collection persistante dans l’application : les fichiers téléchargés constituent la collection.

## Architecture et ressources

- `createVideodio.js` conserve un anneau de JPEG, au maximum douze captures par seconde et 640 pixels sur le grand côté, plus six secondes de PCM mono. Une seule compression est en cours à la fois. Les anciennes captures sont retirées à mesure que le temps avance ; l’historique est figé en Photo et recommence à zéro en revenant au jeu.
- `createTwigBank.js` expose un tap audio après le gain commun. Un ScriptProcessor natif et une sortie muette capturent ce mix sans ajouter de son ni demander de microphone. La connexion est créée seulement lorsqu’un consommateur et un AudioContext existent ; elle est libérée avec la banque. Aucun changement des sources, analyseurs ou enveloppes des pads.
- `createSoundNest.js` suspend la simulation en Photo tout en conservant le rendu et la caméra. La capture vidéo suit le rendu étalonné ; le cadrage initial de l’export est rendu à nouveau avant lecture du canvas.
- `createCameraRig.js` ajoute la rotation verticale, le pincement et la molette en Photo. Les modes drone et gyro conservent leurs interactions.
- L’export utilise Canvas.captureStream, MediaRecorder et Web Audio. Il dure environ dix secondes réelles, décode une seule image JPEG à la fois et libère image, pistes et AudioContext en fin d’export. Les liens Blob précédents sont révoqués lorsqu’ils sont remplacés ou lorsque l’application est détruite.

Le navigateur choisit WebM/VP8/Opus ou MP4 selon ses encodeurs disponibles. Un navigateur sans encodeur affiche une erreur ; le cadrage reste utilisable. L’export est interrompu si la page devient masquée : garder l’onglet visible pendant sa création. Le cadre exporté conserve les proportions du canvas, avec une résolution limitée à 640 pixels pour réduire le coût mobile. Un changement d’orientation pendant le voyage peut étirer les anciennes images au format final.

Le ScriptProcessor est une API ancienne, utilisée ici sans bibliothèque ni worklet supplémentaire ; sa disponibilité et sa stabilité sur Safari/iOS matériel restent à vérifier. Les contrôles Chromium et WebGL logiciel ne constituent pas une mesure de fluidité sur téléphone physique.

## Vérifications

Le test `tests/videodio.spec.js` joue un pad, fige la scène, vérifie l’absence de déplacement et de nouveaux dépôts, tourne la sculpture, zoome par boutons et molette, puis réalise un export natif et le télécharge. FFprobe vérifie la présence des deux pistes et une durée entre 9,7 et 10,5 secondes ; FFmpeg décode l’audio et confirme le silence initial puis le son rétrospectif. Le test contrôle ensuite la reprise du vol. Un second test vérifie l’anneau borné, son gel et sa remise à zéro.

Résultats exécutés sous Chromium : **44 tests de la suite réussis**, puis **les deux tests Vidéodio relancés et réussis** après correction du premier plan blanc. Le contrôle supplémentaire décode aussi l’image à une seconde et vérifie qu’elle contient la sculpture ; les images à une et huit secondes ont été examinées. Le pincement est exercé par événements tactiles natifs via CDP. Build, formatage et diff validés. Safari et téléphone physique non testés.
