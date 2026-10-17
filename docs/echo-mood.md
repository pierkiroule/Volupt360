# OIZO •° — ÉchoMood

## Audit et intégration

L’application React/Vite conserve `createSoundNest`, les géométries de `brushes`, les shaders de pigments, le rig articulé, la caméra drone et le lecteur Web Audio de `createTwigBank`. Les images et le son ne transitent pas par un serveur applicatif. Aucun nouveau paquet n’est ajouté.

Le dépôt contient une seule composition musicale : `public/ambiances/ambiance01.mp3`. Les dossiers `voices` et `poems` contiennent des fragments vocaux ; ils ne sont pas traités comme des ambiances. Le compositeur synthétique historique n’est pas réactivé.

## Quatre responsabilités

- `echoMoodEngine` : 28 inspirations, sélection de 1 à 3 emojis, contributions multidimensionnelles interpolées, mélange circulaire des teintes et variation déterministe. L’ordre des emojis n’affecte pas le résultat. La graine est explicite ; une nouvelle éclosion utilise une autre variation de la famille.
- `universeGenerator` : papier teinté, couleur atmosphérique et paramètres de mouvement. L’étalonnage utilise la teinte du papier pour éviter de blanchir le fond. Une seule géométrie de points diffus, bornée à 48 sur mobile et 96 sur ordinateur, ajoute une respiration atmosphérique discrète. Aucun emoji ne devient une géométrie ou une image dans la scène.
- `brushFactory` : cinq profils réutilisant cinq moteurs de dépôt. Souffle : voiles ; Plume : filaments fins ; Battement : lavis et ondulations ; Éclosion : ramifications arrondies ; Envol : dépôts dispersés reliés par un fil. Couleur, grain, épaisseur, opacité, vitesse, dispersion et sensibilité musicale changent selon la combinaison.
- `musicSelector` : sélection déterministe et modulée dans le catalogue des compositions. L’affinité est une règle artistique, pas une classification acoustique ni émotionnelle. Le catalogue virtuel Vite recense les MP3 directement présents dans `public/ambiances` au démarrage du serveur ou au build. Ajouter des fichiers à ce dossier puis redémarrer/recompiler suffit à enrichir le choix.

Avec un seul MP3, toutes les combinaisons utilisent actuellement la même composition. La différence sonore entre univers dépend donc de l’enrichissement de cette bibliothèque ; aucun morceau artificiel n’est créé pour masquer cette limite.

## Sculpture et contemplation

La nouvelle entrée est « Quel est ton ÉchoMood ? ». Le kit de cinq brosses est disponible dès l’éclosion. Le mode initial permet de sculpter directement au doigt ou à la souris, sans silhouette prédéfinie. La position du geste est projetée dans l’espace 3D, avec une profondeur évoluant avec le geste et la pression lorsqu’elle est disponible. La direction, la distance et le signal musical participent au dépôt. La matière continue ensuite son évolution et sa réponse musicale locale.

Le traitement des mouvements est borné à 30 dépôts par seconde ; l’interpolation des rubans lisse la trajectoire. Envol limite son nombre de dépôts dispersés. Les buffers, le budget de pixels adaptatif, la dissolution et les plafonds mobiles existants sont conservés. Les paramètres modifiés dans l’éditeur concernent les dépôts suivants et restent locaux à la session.

La vue globale permet de tourner l’œuvre avant de reprendre la sculpture dans une autre orientation. Le bouton de sculpture au geste revient à cette pratique. FPV conserve l’oizo comme guide optionnel, avec son sillage et son suivi drone. Gyro, cadrage Photo, PNG HD et vidéodio FPV restent disponibles ; la vidéodio conserve son historique FPV, elle n’enregistre pas la sculpture directe.

## Audio et ressources

La composition sélectionnée se charge après le geste d’entrée, utilise l’analyse spectrale native et apparaît progressivement. Le remplacement croise les gains des lecteurs pendant une courte transition ; l’ancien élément audio, son URL et ses connexions sont ensuite libérés. Les lecteurs en transition sont aussi libérés au démontage.

Lecture/pause, volume et import d’un MP3 personnel restent accessibles. Un fichier absent, invalide ou bloqué ne produit pas d’erreur applicative lors du chargement automatique : la sculpture reste disponible en silence. Un import personnel invalide conserve son message explicite. Revenir au choix des emojis annule le chargement en cours et fait disparaître doucement la musique. Cette annulation ne bloque pas le sélecteur.

À chaque changement d’univers, les dépôts précédents, les masques remplacés et l’atmosphère sont libérés. La préparation des cinq textures intervient uniquement à l’éclosion ou à une modification explicite, jamais dans la boucle de rendu.

## Retour à l’atelier précédent

`/?classic=1` conserve l’entrée et les six matières précédentes pour comparaison et régression. `/?atelier=mp3` conserve l’atelier musical historique. La désactivation d’ÉchoMood peut être réalisée en servant le parcours classique ; aucune donnée distante ni migration de base n’est nécessaire.

## Vérifications et limites

Les tests ciblent la sélection et sa limite, la reproductibilité, les différences de palettes et de profils, les cinq rendus GPU, la réponse musicale et l’évolution graphique, le dessin direct en format mobile, la musique réelle, le volume, la photographie, le changement d’univers, le silence en cas d’indisponibilité et l’annulation d’un chargement. Les suites de régression conservent les contrôles du rig, du sillage, des textures, de la caméra et des budgets mobiles.

Les tests Chromium utilisent un rendu logiciel : ils ne certifient pas une cadence sur téléphone physique ni le ressenti artistique. Le gyroscope et tous les codecs vidéo nécessitent toujours une vérification sur les appareils concernés. La projection des gestes est une sculpture sur un champ de profondeur, pas une capture volumétrique du doigt. Les réglages et l’œuvre ne sont pas persistés après rechargement.

Validation exécutée : les 29 tests ciblés listés dans le README passent, ainsi que `npm run build`, `npm run format:check` et `git diff --check`. Les captures en format mobile de deux combinaisons ont été inspectées. Aucun test de cadence sur téléphone physique n’a été réalisé.
