# L’Oizodio•° — Les pads sculptent le vol

## Expérience

À l’ouverture, douze mélodies procédurales de 3,8 secondes sont prêtes à jouer. Elles partagent la gamme pentatonique de ré majeur, avec des enveloppes douces et des harmoniques amorties. Aucune lecture ni création d’AudioContext avant une interaction. Le canevas occupe tout l’écran ; seuls le nom discret, deux glyphes carrés de vue, le dépliage et la ligne de pads restent visibles. Le bouton + ouvre les fonctionnalités ; − referme l’atelier en revenant aux pads jouables.

Deux actions, dans une seule application : **Mes sons** permet de remplir les douze pads au microphone ou par import audio ; **Jouer** permet de sculpter en jouant ces sons. Chaque pad correspond à l’une des douze brosses existantes. La buse ailée vole continuellement, y compris lorsque les pads sont silencieux. Seuls les sons joués sur les pads déposent leurs matières sur son trajet ; écouter un sample dans Mes sons ne peint pas.

Microphone et imports sont limités à **cinq secondes par pad**. Pour un fichier plus long, les cinq premières secondes sont conservées. Une brindille peut être remplacée ou supprimée. Les fichiers restent dans la mémoire de l’onglet ; ils ne sont pas envoyés et disparaissent au rechargement. Les imports sont limités à douze mégaoctets avant décodage.

Un tap joue le sample jusqu’à son terme ; maintenir au moins 300 ms le prolonge en boucle jusqu’au relâchement. Les accords conservent chaque brosse et chaque analyse acoustique. Les deux vues existantes, la rotation tactile de la scène et les textures personnelles restent disponibles ; l’éditeur du pad expose une action Texture, distincte du maintien sonore.

## Architecture

- `createDefaultMelodies.js` synthétise le PCM déterministe des douze mélodies une seule fois au montage, hors boucle de rendu. Les buffers initiaux peuvent être remplacés par un enregistrement ou un import ; supprimer un son laisse volontairement son pad vide pendant la session. `/?samples=empty` ouvre une banque vide pour les tests et pour composer entièrement ses propres sons.
- `createTwigBank.js` gère capture, import, conversion mono 24 kHz, enveloppes courtes, lecture et annulation. Chaque voix possède son analyseur propre, placé avant le réglage du volume commun, pour conserver les différences acoustiques entre pads. Le maximum est douze buffers de 120 000 frames, soit 5,76 Mo de PCM conservé, hors mémoire transitoire du décodeur et du navigateur. Une écoute de préparation n’est pas transmise à la danse.
- `SonoizoDance.js` réutilise les trajectoires continues de `createPainterFlight.js`, avec une impulsion sonore amortie à chaque déclenchement et un biais déterministe par pad et graine. Les sons modulent le vol sans réinitialiser sa position ou sa tangente. Le vol continue en silence.
- `createOizo.js` produit une buse ailée minimaliste, alignée sur la direction du vol, avec une animation légère des ailes. Ses géométries et matières sont libérées à la destruction.
- `BrushBridge.js` transmet la position et le repère du vol à chaque brosse audible, avec ses caractéristiques acoustiques propres. Les déclenchements courts disposent de deux premiers échantillons rapprochés, puis les dépôts sont espacés à 120 ms. Les streams se ferment à l’arrêt du son ou au retrigger, sans relier les portions de trajet parcourues en silence.
- `createSoundNest.js` conserve la construction, les textures, la dissolution et la destruction des douze brosses. Un état de tracé par pad permet les dépôts simultanés. Le plafond de quatre-vingts tracés protège les tracés actifs ; les fenêtres spatiales diminuent leur densité sans annuler la réponse d’un pad. La sculpture cesse de vieillir lorsque plus aucun pad sonore ne joue, tandis que la buse continue de voler.

La palette, les shaders des brosses, le cache de vingt-quatre masques et le module de textures importées sont conservés. Aucun framework ou backend ajouté. Aucun sélecteur de canevas ou déroulement en quatre lots dans l’interface principale.

## Réversibilité

Branche `feature/sonoizo`. `VITE_ENABLE_SONOIZO=false npm run build` restaure l’ancien atelier MP3 ; réactiver la variable ou la supprimer pour revenir aux pads. L’atelier MP3 reste accessible par `/?atelier=mp3`, sans troisième onglet dans l’expérience principale. L’audit historique est conservé dans [sonoizo-lot-1.md](sonoizo-lot-1.md).

## Contrôles et limites

La banque est testée avec un microphone factice natif Chromium, MediaRecorder et Web Audio réels. Les tests couvrent la limite exacte de cinq secondes, les imports MP3/WAV, les erreurs d’import sans perte du sample précédent, les annulations, douze voix bornées, le maintien multitouch et le clavier. Les tests de danse vérifient un trajet reproductible et continu en XYZ, le vol en silence, les douze brosses déposées par les pads, l’arrêt des dépôts après le son et la distinction acoustique entre un pad faible et un pad fort. Les tests historiques gardent l’atelier MP3 explicite pour contrôler les régressions.

Les tests WebGL logiciels et la capture mobile ne remplacent pas des essais sur téléphone physique ; Safari/iOS, les micros matériels et le profilage complet du heap restent à vérifier. Un import audio est décodé entièrement avant découpe : sa mémoire transitoire dépend de sa durée et de son codec, malgré la limite de taille du fichier. Les formats disponibles dépendent des décodeurs du navigateur. L’export PNG était absent du dépôt audité et ne fait pas partie de cette correction.

Résultats exécutés : suite de 39 tests réussie sous Chromium, puis test supplémentaire de cadrage portrait réussi après ajustement des bornes de vol à vide, soit 40 tests distincts vérifiés. Build actif et formatage réussis. Build avec `VITE_ENABLE_SONOIZO=false` réussi, puis vérification du build servi : atelier NID SONORE, douze brosses, buse désactivée et aucun AudioContext créé. Le build actif a ensuite été régénéré. Captures desktop et mobile examinées : buse ailée et dépôt simultané de Voiles et Aurore, pads accessibles. Les essais sur téléphone physique ne sont pas déclarés exécutés.

Mise à jour mélodies et interface repliable : 40 contrôles de la suite passent ; deux attentes historiques sont adaptées au slogan masqué et à la banque initiale, puis les quatre tests ciblés concernés passent, soit 42 tests distincts vérifiés. Build et formatage validés ; captures Chromium portrait de l’interface repliée et dépliée examinées.
