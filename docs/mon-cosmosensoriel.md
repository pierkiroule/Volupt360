# Mon CosmoSensoriel •°

Un instrument de composition projective : choisir des sensations autour d'un disque, déposer des zones, régler leurs proportions et leur transparence, puis traverser leur univers imaginaire. Les émojis servent de vocabulaire d'inspiration ; aucune émotion, sensation ou signification psychologique n'est inférée.

## Palette

16 invitations : chaleur douce, cotonneux, ruissellement, tension, souffle, flou, fraîcheur, enveloppement, vibration, légèreté, foisonnement, chaleur vive, poids, picotements, fluidité et espace intérieur. Les anciens identifiants restent valides pour préserver les sauvegardes.

## Monde flottant

`CosmoMatter` remplace le terrain visible et les groupes de végétation dans l'expérience principale. Il compose des îlots de pigments, deux membranes aquarellées par zone mise en avant, des nuages translucides, des orbites d'encre, quatre courants de pigments aux bords secs et aux canaux capillaires, six confluences centrales au maximum et 36 fragments minéraux flottants. Jusqu'à 12 zones saillantes disposent de matières détaillées ; toutes les zones participent au fond aquarellé et à la composition musicale. Les ressources graphiques partagées sont libérées au démontage.

Le champ de particules compte 1000 points sur petit écran, 1800 sur grand écran ; déplacements calculés dans le vertex shader, sans réécriture des buffers à chaque image. Des familles de mouvements différencient flux, tension, picotements, poids et chaleur. Le niveau sonore réel, lu dans un buffer réutilisé, module doucement leur expansion et la présence des filaments. Pas de flash, de pulsation brutale ou de lumière stroboscopique. Le cosmos reste animé sans son ; pause et mouvement réduit restent disponibles.

La caméra conserve le tactile et le gyro à horizon stable. Le vol automatique parcourt un volume autour du centre ; il n'est plus contraint à suivre un sol. Le module de paysage reste accessible avec `?paysage`, et ses fonctions de composition servent encore de grammaire commune à la sélection musicale et aux assets.

## Poly Haven

L'API existante est réutilisée, sans nouvelle dépendance. Un modèle compatible peut apparaître en trois exemplaires au maximum, suspendu dans le cosmos avec dérive lente. Le réseau ne bloque pas le rendu ; le secours procédural est toujours présent. Une attribution discrète accompagne le modèle chargé.

L'accès réel à Poly Haven est bloqué depuis l'environnement de développement. Les chargements réels restent donc à valider ; un test glTF avec dépendances synthétiques couvre le parseur existant. Aucune URL de modèle n'est inventée.

## Son et limites

Le moteur Strudel existant réutilise le mélange pondéré des zones pour choisir harmonies, densité et timbre. Le démarrage reste volontaire, et le retour au disque suspend la musique. Musique stéréo, sans sources sonores positionnelles. Les textures aquarellées sont procédurales. Les validations Chromium ne remplacent pas l'écoute et le contrôle gyroscope sur téléphone physique ; aucun FPS réel n'est annoncé.

## Rencontres vivantes

`LivingPhenomena.tsx` ajoute trois présences procédurales à la scène commune, sans téléchargement nécessaire : tournesol (36 pétales et 72 graines instanciés), courant liquide (deux tubes texturés et 48 gouttes) et pierres-plumes (7 pierres et 64 fragments effilés). `phenomenaConfig.ts` centralise leurs associations aux sensations et les mots évocateurs. Une présence par famille au maximum ; le choix le plus présent de chaque famille détermine sa palette, sa graine et sa position.

Le tournesol se balance et déploie davantage ses pétales à l'approche. Sa libération de graines possède un temps de repos d'au moins 24 secondes ; les graines s'élèvent, se dispersent doucement puis dérivent vers le courant liquide s'il existe. Ce couplage est géométrique, sans nouvelle simulation physique ou moteur audio. Le courant se dilate à proximité et anime des gouttes remontant son parcours. Les pierres alternent contraction et déploiement de fragments plumeux ; l'approche infléchit cette transformation. Pas de flash ou d'explosion sonore.

Un mot de la famille émerge à proximité après quelques secondes, dérive et disparaît en sept secondes. Les réapparitions sont espacées ; les mots ne proposent ni interprétation psychologique ni consigne. L'intégralité de ces mouvements, interactions et apparitions est suspendue en pause. Les textures, géométries et matériaux sont libérés au démontage. Pas de police distante, nouveau package ou appel réseau supplémentaire.

Tests dédiés : sélection par famille, reproductibilité, repos des surprises, trajectoires de graines finies ; rendu des trois présences, absence d'erreurs WebGL/JavaScript, pause et réentrée sans perte de composition. Le test de rendu ne prétend pas valider la qualité perceptive ou les performances sur téléphone physique.

## Stabilité 360°

L'activation du gyro passe d'abord en contemplation fixe : aucun déplacement tant que Voyager n'est pas choisi explicitement. Le tactile reste disponible. Le cap est conservé aux passages proches du zénith/nadir et recalibré à la sortie de cette zone, pour éviter l'inversion de 180° de la projection horizontale. Un changement portrait/paysage recale le cap sur le regard actuel ; les variations de caméra sont lissées et bornées en vitesse. La désactivation du capteur conserve le regard atteint.

Le culling CPU est désactivé uniquement pour les voiles/rubans déformés dans les shaders, dont les bornes géométriques initiales ne couvrent pas toujours la forme animée. Les autres objets conservent leur mécanisme de visibilité.

Deux tests de régression ont échoué avant correction : vol encore actif en entrant en 360° et inversion de cap de π lors d'un passage au pôle. Ils passent après correction. Les contrôles couvrent aussi le changement d'orientation écran, l'horizon, la conservation de position et la limitation des sauts de cap. Validation gyro sur appareil physique toujours nécessaire.
