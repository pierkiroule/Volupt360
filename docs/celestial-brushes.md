# Planètes aquarellées

Les 18 brosses gardent leurs géométries et leurs animations. Six planètes de matière circulent dans chaque univers. Un **double tap sur une planète** sélectionne sa brosse ; un halo bleu discret entoure la planète active. Traverser une planète avec l’oizo ne change plus la matière. Il n’y a ni menu des brosses ni import d’image.

Glisser guide le vol. Maintenir le canevas en FPV fait déposer la matière par l’oizo, jamais par le doigt. Relâcher arrête le tracé. La première brosse de l’univers est sélectionnée au départ, avec son halo. Le nom actuel et le geste de sélection sont rappelés discrètement en bas de l’écran. En mode photo, la sélection est désactivée et les planètes se figent avec la scène pour permettre le cadrage.

## Rendu et matières

`CelestialBrushes.js` utilise une géométrie sphérique partagée de 24 × 16 segments, six matériaux opaques visibles et un halo partagé. Une ombre douce calculée à partir des normales fait lire le volume sans ajouter d’éclairage ou de passes de post-traitement. Les planètes tournent lentement sur elles-mêmes et conservent leurs orbites. Elles partagent les transformations de la sculpture. Elles ne sont pas dessinées derrière l’accueil.

`createWatercolorTexture.js` prépare une texture RGBA fixe par brosse : migrations de pigment, auréoles de séchage, concentrations sur les bords, granulation et fibres fines. Les brosses continuent d’utiliser l’alpha ; les sphères utilisent la couleur sur un volume opaque. Les matières évoquent l’aquarelle sans simulation physique complète de l’eau et du papier.

Les textures du moteur passent de 512 × 512 à 256 × 256 : environ **6 Mio** de texels RGBA avec mipmaps pour les 18 textures, contre 24 Mio auparavant, hors copies CPU et ressources existantes. Elles restent préparées hors boucle de rendu et partagées entre planètes et brosses. Le calcul quadratique des voisins qui pilote la dissolution est désormais réalisé toutes les 0,6 secondes de peinture, au lieu de chaque image ; son vecteur de travail est réutilisé. La dissolution conserve son interpolation à chaque image.

## Sélection

Un raycaster interroge uniquement les six sphères visibles, à la fin d’un tap court. Deux taps sur la même planète à moins de 420 ms, séparés de moins de 24 pixels, sélectionnent sa matière. Un déplacement de plus de 8 pixels, un maintien de plus de 320 ms ou une annulation invalident le geste. Les horodatages des événements sont utilisés pour ne pas ajouter le retard du traitement aux intervalles. La sélection n’est pas active en mode photo. Les intersections sont triées en profondeur et tiennent compte des transformations de la sculpture. Les buffers du raycaster sont réutilisés.

Le changement ferme les tracés en cours puis réutilise les fonctions de dépôt existantes. Le vol, l’audio et les rencontres avec les anciennes traces restent ceux du moteur existant. Les géométries et matériaux des planètes sont libérés au démontage, ainsi que leurs écouteurs ; les textures partagées restent sous la responsabilité du moteur.

## Vérification

Les tests couvrent le double tap tactile, le tap simple, le glissement, le blocage en mode photo, la sélection du volume 3D et l’alignement du halo. Le parcours mobile exerce la peinture sans import et le cadrage photo. Les 18 brosses sont réellement rendues en WebGL et les contrôles audio natifs sont conservés.

La fluidité sur téléphone physique, le gyroscope matériel et l’encodage vidéo complet restent à vérifier. Les optimisations réduisent les coûts identifiés dans le code ; aucun gain en images/seconde sur appareil Android physique n’est revendiqué.

Validation exécutée : 11 tests ciblés distincts réussis, dont les trois tests de planètes rejoués après l’ajustement visuel final. Compilation Vite réussie. Aucun test sur téléphone physique.
