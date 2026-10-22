# Cosmos léger : soie aquarellée et filaments

La priorité est le mouvement organique avec un budget GPU prévisible. Le disque, les sauvegardes, la musique et la navigation restent conservés.

## Rendu

- Deux nappes de tissu transparent au maximum, de 28 × 14 subdivisions chacune. Trois ondes lentes déforment leurs positions au vertex shader. Leur aspect utilise une texture de pigments de 256², un grain, une trame discrète et une variation de lumière simulée par les plis. Pas de simulation physique ou matériau PBR.
- Un seul objet `LineSegments` regroupe les contours courbes. Jusqu'à six zones sur petit écran, huit sur grand écran. Les autres zones participent toujours au ciel et à la musique. Soleil, courants, cocons et spirales possèdent des profils différents.
- 120 points discrets sur mobile, 200 sur grand écran, contre 1000/1800 auparavant. Leurs mouvements sont calculés au GPU. Aucun recalcul ou transfert des buffers par image.
- Pas de terrain, d'objets pleins, de PMREM, d'ombres ou de chargement de modèles dans le cosmos. Le test mesure six appels de dessin et 3776 triangles ; les contrôles imposent un plafond de huit appels et 4500 triangles pour cette scène mobile. DPR plafonné à 1,25. Ces bornes ne constituent pas une mesure de FPS sur téléphone physique.

Les anciens phénomènes pleins restent dans le dépôt mais ne sont plus montés par le cosmos. Les ressources des nappes et des filaments sont libérées au démontage. Le son est analysé à fréquence réduite ; les contours réagissent par une déformation douce. Pause conserve la matière dans son état courant.

## Retrait de Poly Haven

`AssetLibrary.ts`, les appels à l'API, les modèles distants et le chargement HDRI ont été supprimés. Cela concerne le cosmos et la route `?paysage`, qui conserve son terrain et ses objets procéduraux locaux. Aucun import de parseur glTF/HDRI lié à cette API ne reste dans ce pipeline. Les anciennes métadonnées de sauvegarde restent lisibles ; elles ne déclenchent aucun téléchargement. Les fichiers utilisateur locaux ne sont pas supprimés.

## Vérifications

Tests des buffers déterministes, des bornes mémoire et géométriques, du nombre d'appels de dessin, de l'absence de requêtes Poly Haven, de la réentrée et des sauvegardes, ainsi que du geste tactile précédemment responsable de la plongée. Le test glTF synthétique de l'intégration supprimée a été retiré. La validation esthétique et la fluidité sur le téléphone réel restent à confirmer.

Le service worker ne précharge plus les 31 Mo du dossier de textures historique. Les images sont mises en cache au premier usage ; les scripts et styles de l'application restent précachés. Un test sur le build de production vérifie l'absence de téléchargement massif, la mise en cache d'une image demandée, la restauration du disque et l'entrée dans le cosmos hors ligne.
