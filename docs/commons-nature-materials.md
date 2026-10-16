# Matières naturelles Wikimedia Commons

## Photographies uniquement

La collection démarre avec une matière. « Nouvelle matière » tire une photographie parmi mousse, plume, écorce, eau, lichen, fleur et feuillage. Aucune recherche, aucun téléchargement et aucun décodage de chant d’oiseau ne sont nécessaires. Une bibliothèque audio indisponible ne bloque donc plus les textures.

L’image est décodée hors boucle de rendu, analysée à 64 × 64 pixels : palette, luminance, contraste et contours. Le profil reproductible dérivé de l’identifiant de la photographie choisit une famille de brosse existante. Le moteur aquarelle utilise les champs analysés pour composer sa texture. Il ne remplace pas les moteurs de peinture ni le mouvement de l’oizo.

La création essaie au plus trois photographies, exclut les candidates déjà essayées et conserve les matières précédentes en cas d’échec. La recherche reste bornée à trois thèmes, trois pages et vingt fichiers par page.

Le maintien du canevas fait sculpter l’oizo, jamais le doigt. L’ambiance musicale existante reste audible et alimente l’audioréactivité ; sculpter ne la réduit plus pour laisser place à un chant.

## Compatibilité et ressources

`createBirdSongs` conserve temporairement son nom et son interface pour éviter de modifier les nombreux consommateurs de la collection. Son implémentation est désormais un adaptateur de matières photographiques : `prepare`, `warm`, `start` et `stop` n’effectuent aucune opération audio. Les entrées de collection contiennent uniquement la photographie et son profil. La destruction annule les requêtes et libère les références aux profils ; les textures GPU restent gérées par le moteur existant.

Le cache média limité et le relais CORS existants sont réutilisés. Les téléchargements restent limités et les URL contrôlées par le serveur. Les erreurs réseau et de décodage sont présentées avec une possibilité de réessayer.

## Licences

CC0, domaine public explicitement identifié, CC BY et CC BY-SA 3.0/4.0 sont acceptés ; NC, ND et licences inconnues sont exclus. Les versions originales sont préservées. Les crédits téléchargeables contiennent les photographies transformées, leurs auteurs, sources, licences et les modifications. Les adaptations CC BY-SA sont proposées sous CC BY-SA 4.0 ; les conditions sont affichées dans les crédits et le cadrage des exports. Joindre les crédits aux images et vidéos partagées : ils ne sont pas automatiquement incrustés dans les fichiers.

## Vérification

Les tests navigateur utilisent des photographies PNG et des réponses Commons simulées : création sans aucune recherche audio, ajout de matières, rendu pendant le maintien, crédits, conditions de partage, repli CORS et conservation de la collection lors d’une erreur. La disponibilité des vrais médias reste à vérifier sur le déploiement ; le réseau de l’environnement de développement bloque l’accès direct à Commons. Le téléphone physique et le gyroscope matériel ne sont pas validés par ces tests.
