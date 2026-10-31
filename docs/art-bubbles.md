# Résonances émotionnelles locales

Les API d’images, œuvres photographiques, crédits et panneaux Sources ont été retirés du parcours actif. `ArtCollection.ts` et `ArtBubbles.ts` sont remplacés par `EmotionalResonance.ts` ; aucune requête Commons ou musée, ni téléchargement d’image, n’est effectué pour les rencontres.

Trois compositions abstraites habitent le même ciel Three.js. Chacune comporte quatre rubans pigmentés entrelacés et une petite constellation de grains. Les douze profils éditoriaux modulent couleurs, courbure, élévation et vitesse. Plusieurs choix se mélangent, sans prétendre mesurer ou interpréter un état psychologique. Une proximité réelle en 3D ouvre doucement les voiles et renforce les détails ; la traversée reste continue, sans modale ni changement de caméra.

L’énergie musicale est lissée avant d’infléchir légèrement la surface. La couleur n’est pas un clignotement de volume. Le shader produit le grain, les lavis et les bords diffus sans texture distante. Deux géométries partagées pour trois sites, six appels de rendu supplémentaires, 384 grains sur mobile / 720 sur ordinateur. Pas de nouvelle boucle RAF, de render target ou de contexte WebGL. Les déformations repartent toujours des coordonnées originales. Tous les matériaux et les deux géométries sont libérés au démontage.

Le temps commun respecte la pause et les mouvements réduits. Vol, météo, gyroscope, musique locale et choix d’émotions restent en place. Les scènes sont des sculptures procédurales légères, pas des simulations physiques de pigment ou de véritables volumes de nuage.

Tests : rendu GPU réel des shaders, douze profils distincts, réponse de proximité lissée et pause, absence de texture GPU et de croissance des géométries après mise à jour, libération des ressources, parcours mobile simulé sans appel API. Téléphone physique et performances prolongées restent à vérifier.
