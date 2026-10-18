# Vol caméra en première personne

L’avatar oizo n’est plus instancié ni animé dans la scène. Le moteur de trajectoire existant pilote désormais le point de vue : la caméra est placée exactement sur la position du vol, et regarde dans sa direction, après transformation dans le repère de la sculpture. La poursuite, son décalage latéral et son recul sont retirés du chemin FPV. Le champ de vision est de 88 degrés.

L’expérience ÉchoMood démarre en FPV. Les glissements orientent le vol via le pilotage relatif à l’écran existant ; au relâchement, l’exploration autonome des traces continue. Un appui immobile de 450 ms dépose la matière 2,4 unités devant le regard, avec les brosses et le déploiement progressif existants. La sculpture directe reste accessible par son bouton. Le mode gyro, la vue globale et la photo sont conservés.

Les bulles poétiques utilisent la même position que l’œil de la caméra en FPV. Leur éclatement, la sélection des 24 textes selon le mood, l’affichage de cinq secondes, le compteur et la musique ne changent pas.

Les sources historiques du rig de l’oiseau restent disponibles pour réversibilité, sans être importées par le moteur actif. Les tests historiques spécifiques à la poursuite d’un avatar décrivent l’ancien comportement ; les tests de première personne vérifient la position et l’orientation réelles, l’absence d’avatar, le démarrage FPV, le pilotage et le dépôt par appui long. La qualité de navigation sur téléphone physique reste à valider.

## Pilotage par point de visée

Le mode actif utilise désormais `createPointFlight` plutôt que le champ orbital : un point projeté devant la caméra représente le cap visé. Le repère est capturé au début du glissement, afin qu’un doigt immobile ne produise pas de rotation infinie. Le déplacement tactile change la cible dans ce repère fixe ; la direction converge progressivement vers elle. Relâcher conserve immédiatement le cap atteint, sans retour autonome vers les traces. Lever puis reposer le doigt permet de poursuivre un virage. La vitesse est constante et douce (2,6 unités/seconde), sans modulation musicale du pilotage. Les brosses conservent leur audioreactivité.

Validation : 3 tests ciblés réussis et build Vite réussi. Le test du point vérifie la convergence malgré un repère caméra changeant, la conservation du cap après relâchement et la vitesse. Essais sur téléphone physique encore nécessaires.

## Retour de l’oizo

L’oizo et son rig d’ailes sont de nouveau actifs. La caméra suit son cap à une distance fixe de 5,5 unités, sans décalage latéral. Le pilotage par point de visée et la conservation du cap au relâchement sont conservés ; le retour automatique orbital reste désactivé. Les brosses déposent de nouveau depuis sa queue. La sculpture directe masque l’oizo comme auparavant.

## Alternance manuelle / autonome

Le contact donne immédiatement priorité au point de visée, avec une convergence plus précise (amortissement 9/s). Au relâchement, après 300 ms, le vol rejoint une orbite autour du centre de l’œuvre. Son rayon dépend de l’étendue de la sculpture (borné entre 8 et 28 unités), et varie lentement avec la hauteur suivant des phases pseudoaléatoires semées à l’ouverture. Le centre est interpolé pour éviter les ruptures quand l’œuvre grandit. La vitesse demeure 2,6 unités/seconde ; aucune téléportation. Un contact sans glissement interrompt aussi le retour autonome et conserve le cap courant, notamment pendant le tracé par appui long.

## Dépôt au contact

Le délai d’appui long est retiré. Pointerdown ouvre immédiatement le dépôt et émet un premier échantillon depuis la queue, avec la dernière pose disponible. Le tracé continue pendant le glissement de pilotage, à une fréquence maximale de 30 échantillons/seconde ; pointerup, annulation et perte de focus terminent le dépôt. Le doigt pilote toujours le vol, il ne dessine pas directement la matière en mode FPV.
