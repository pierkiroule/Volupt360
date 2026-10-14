# Corps célestes aquarellés

Les 18 brosses existantes gardent leurs géométries et leurs animations. Les six matières de chaque univers circulent maintenant comme des astres de pigment. Traverser un astre change la brosse active. Il n’y a plus de pads de sélection, de sélecteur de texture ni d’import photographique dans l’interface.

Glisser continue de guider le vol. Maintenir le canevas en FPV fait déposer la matière par l’oizo, jamais par le doigt. Si un astre est traversé pendant ce maintien, le dépôt reprend avec sa matière. Relâcher arrête le tracé. La matière de départ correspond à la première brosse de l’univers. Le nom actuel apparaît discrètement en bas de l’écran.

## Matières fixes

`createWatercolorTexture.js` prépare une texture RGBA de 512 × 512 par brosse à partir d’une graine fixe et de sa couleur. Des champs de bruit interpolés à plusieurs échelles produisent des migrations de pigment, des auréoles de séchage, des concentrations sur les bords, de la granulation et des fibres fines. Les textures sont identiques à chaque ouverture et ne sont pas modifiables par le visiteur. Ce sont des matières procédurales évoquant l’aquarelle, pas une simulation physique complète de l’eau et du papier.

La préparation se fait à l’initialisation, jamais dans la boucle de rendu. Les mêmes textures servent aux corps célestes et aux brosses, y compris aux six brosses de particules. Les silhouettes originales restent intactes. Dix-huit textures avec mipmaps représentent environ 24 Mio de texels RGBA, hors copies CPU et ressources existantes. Les matériaux des astres ne possèdent pas leurs textures : celles-ci sont libérées une seule fois par le moteur après les tracés.

## Traversées

`CelestialBrushes.js` gère des orbites lentes à rayons et hauteurs variables. Seuls les six corps de l’univers choisi sont affichés et interrogés. La collision utilise le segment de déplacement relatif entre l’oizo et chaque astre, avec un rayon de 2,6 unités : une projection visuelle ne suffit pas, et un passage rapide n’est pas perdu entre deux images. Une marge de sortie de 3,3 unités, un intervalle global de 2,5 secondes et un délai de 12 secondes par corps limitent les changements répétés.

L’oizo conserve son moteur de vol et n’est pas attiré ni téléporté vers les astres. Le changement de matière ferme les tracés en cours puis réutilise les fonctions de dépôt existantes. Les ambiances, la synthèse procédurale, les rencontres avec les anciennes traces, le gyroscope et l’export restent ceux du moteur existant. Les astres partagent les transformations de la sculpture et sont figés en mode photo.

## Vérifications et limites

Les tests dédiés exercent la reproductibilité et la variété alpha, les collisions traversantes avec deux extrémités hors du corps, la protection contre les répétitions et la libération des matériaux. Le parcours mobile vérifie l’absence d’import et de pads, le tracé par maintien sans photo préalable et l’accès au cadrage PNG. Les tests musicaux ciblés contrôlent le son réel et ses variations.

La lisibilité artistique et la fluidité sur téléphone physique, la caméra/gyroscope matériels et l’encodage vidéo complet restent à vérifier. Les anciens composants photographiques sont conservés comme code inactif de prototype ; ils ne sont plus importés par l’application. Les anciens tests de parcours photographique sont remplacés par le parcours des corps célestes.

Validation exécutée : 13 tests ciblés distincts réussis sous Chromium avec WebGL logiciel, dont le rendu effectif des 18 brosses, le parcours mobile et les contrôles audio natifs. Compilation Vite, contrôle Prettier et `git diff --check` réussis.
