# Brosses photographiques — transduction visuelle et sonore

Les **18 brosses** possèdent chacune leur propre image, dans les trois univers. Une photo ou une image importée est requise avant de peindre avec une brosse. Sa silhouette et son comportement de dépôt sont conservés : rubans, voiles, bulles, réseaux et six brosses de particules.

## Utilisation

Un toucher sur un pad sans image ouvre « Prendre une photo / Importer une image », avec le nom de la brosse. Après import, sa vignette apparaît dans la bulle. Un toucher joue et sculpte ; maintenir le pad 700 ms ou ouvrir son menu contextuel propose de remplacer son image. Un maintien sur le canevas avec une brosse non préparée ouvre aussi ce sélecteur. Le doigt ne dessine pas : l’oizo reste la buse.

Les images et leurs identités sonores sont indépendantes et restent disponibles quand on change d’univers. Elles ne sont conservées que pendant la session. Le sélecteur traite erreurs, annulation, demandes obsolètes, Échap et focus. Une image invalide ne remplace pas la précédente.

## Reconnaître les photos

Le masque blanc du pilote a été remplacé par une vraie texture photographique RGBA : les couleurs RGB et les détails sont conservés. La transparence reste plus généreuse, pour que les zones claires de la photo ne disparaissent pas. Les shaders mêlent environ 90 % de couleur photographique à la matière existante. Les images photographiques ne sont plus répétées plusieurs fois le long du tracé ; les masques procéduraux existants conservent leur comportement.

Les six brosses de particules acceptent maintenant elles aussi leur texture photographique, y compris lors d’un remplacement. Leurs motifs, formes, animations et buffers restent ceux d’origine. Les formes étroites comme les filaments ou les réseaux fragmentent naturellement l’image : elles ne deviennent pas des panneaux rectangulaires. Les photos les plus lisibles restent celles avec des formes contrastées et des sujets simples.

La plus grande dimension de la texture est limitée à 384 pixels et les proportions sont conservées à l’import, sauf un minimum technique de 16 pixels pour le petit côté. Le bitmap source est fermé après analyse. Le décodage natif initial peut temporairement utiliser la résolution complète : la limite est de 15 Mo et 40 mégapixels. JPEG, PNG, WebP, AVIF et GIF (première image) sont pris en charge ; HEIC nécessite une conversion préalable.

## Résonance

La grille d’analyse de 16 × 16 cellules conserve luminosité, couleur, saturation et contours. L’angle et la hauteur du dépôt choisissent la région explorée. La même cellule influence la couleur initiale du tracé et le son : degrés dans la gamme de l’univers, matière cristalline ou corde, richesse FM et amortissement Karplus–Strong. Il s’agit de correspondances artistiques, pas d’une reconnaissance sémantique des objets photographiés.

Les profils sont partagés avec les trois moteurs ambient et réappliqués après leur recréation. La musique autonome peut continuer avant de préparer les brosses ; seuls leurs dépôts exigent une image. Aucune nouvelle bibliothèque, aucun sample audio et aucun backend.

## Vie des ressources

L’analyse et la fabrication de la texture ont lieu à l’import, hors boucle de rendu. Le moteur graphique possède les textures. Au remplacement, le binding des anciens tracés de cette brosse est mis à jour et l’ancienne texture est libérée ; leur ancienne couleur de base reste conservée. Les profils des autres brosses ne sont pas remplacés. À la destruction, textures et références sont libérées. Une demande annulée libère son résultat sans modifier la scène.

Aucune image n’est envoyée ou persistée. Recharger la page demande de les sélectionner à nouveau. Le coût GPU reste borné à une texture photographique par brosse et aux ressources existantes ; préparer les 18 images utilise davantage de mémoire qu’une seule.

## Contrôles

Les tests importent une image pour chacun des 18 pads, vérifient la vignette et le binding utilisé par son matériau, puis retrouvent les images en revenant au premier univers. Le déplacement et le mode photo restent exercés. Un test de pixels WebGL vérifie que les zones rouges et bleues d’une image source sont effectivement présentes dans le rendu d’un ruban et d’une plume, et que les proportions sont conservées à l’import.

Les contrôles du pilote continuent de vérifier remplacement, image invalide, absence d’envoi POST et différences de synthèse sur AudioContext réel. La capture d’un vrai appareil photo et l’écoute/fluidité sur téléphone physique restent à vérifier. L’encodage vidéo complet n’a pas été rejoué dans cette évolution.

Validation exécutée : 13 tests Playwright ciblés réussis sous Chromium, compilation Vite réussie, contrôle Prettier et `git diff --check` sans erreur.
