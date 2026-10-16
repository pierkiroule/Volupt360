# Matières créées depuis des photos locales

## Utilisation

Le paysage commence avec un emplacement de brosse à remplir. « Importer une photo » ouvre les fichiers de l’appareil. « Prendre une photo » utilise un sélecteur avec `capture="environment"`, qui privilégie la caméra arrière sur les navigateurs mobiles compatibles. Le navigateur peut proposer son propre choix de caméra ou de galerie ; sur ordinateur, le sélecteur de fichiers reste disponible. Annuler ne modifie pas la collection.

Une photo crée une matière et la sélectionne. Chaque photo suivante ajoute une brosse, jusqu’à 18. Le maintien du canevas fait tracer l’oizo avec la brosse sélectionnée ; le doigt continue de guider le vol. L’ambiance MP3, l’audioréactivité, les caméras et les exports restent inchangés.

## Traitement local

`src/materials/naturePhoto.js` décode une image d’analyse de 512 × 512 pixels avec orientation EXIF, puis calcule à 64 × 64 pixels la palette, les contours, le contraste et un champ de texture. Une empreinte des pixels sert de graine reproductible. Le profil choisit une famille de brosse existante et alimente le moteur aquarelle, hors de la boucle de rendu.

Le fichier doit être une image de 20 Mo maximum. JPEG, PNG et WebP dépendent des décodeurs du navigateur ; un format non pris en charge (par exemple HEIC selon l’appareil) produit un message invitant à utiliser un autre format. Une erreur conserve toutes les matières précédentes. Le sélecteur est réinitialisé pour permettre de reprendre le même fichier.

Le bitmap est fermé après l’analyse. Aucun fichier original, URL temporaire ou texture photographique pleine résolution n’est conservé. Les profils analysés restent seulement en mémoire pour la session. Les textures de brosses sont toujours libérées par le moteur existant.

Les routes API, le relais Commons, le catalogue distant, le cache réseau et les crédits Commons sont retirés. L’adaptateur interne conserve temporairement son nom `createBirdSongs` pour ne pas refondre les consommateurs existants ; il génère uniquement des profils depuis le fichier fourni et ne joue aucun chant.

## Vérification

Les tests utilisent de vrais fichiers PNG générés en fixture : import, entrée caméra, sélection, ajout, tracé, absence de requêtes externes, erreur de décodage, limites de taille, reproductibilité et conservation des brosses. Ils ne valident pas l’ouverture d’une caméra physique ni le décodage HEIC d’un téléphone réel.
