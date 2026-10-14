# Transduction photographique — pilote Voiles

Cette première étape concerne uniquement **Voiles**, conformément au prototype proposé. Les 17 autres brosses et les trois univers ambient conservent leur fonctionnement.

## Geste

Toucher le pad Voiles sans image ouvre un sélecteur « Prendre une photo / Importer une image ». Le premier bouton utilise une entrée native avec `capture=environment` ; le second ouvre la bibliothèque. Après import, le pad affiche une vignette. Le toucher joue et sculpte ; un appui de 700 ms ou le menu contextuel permet de remplacer l’image. Sur le canevas, un maintien avec Voiles sans image ouvre également le sélecteur : la sculpture demeure produite par l’oizo, jamais par le doigt.

Le sélecteur gère chargement, erreurs, annulation, Échap et circulation du focus. Une image invalide ne remplace pas l’ancienne matière. Les fichiers JPEG, PNG, WebP, AVIF et GIF (première image) sont acceptés, jusqu’à 15 Mo. Les formats non pris en charge et les décodages impossibles affichent une erreur. HEIC n’est pas directement pris en charge : exporter en JPEG sur les appareils concernés.

## Traitement local

`ImageBrush` décode avec `createImageBitmap`, demande une réduction à 256 × 256 et ferme le bitmap. Le fichier original n’est pas conservé. Deux dérivés restent en session : une vignette JPEG et un masque RGBA 256 × 256, plus une grille de 16 × 16 cellules contenant couleur, luminosité, saturation et contours. Aucune image n’est envoyée, stockée sur un serveur ou persistée dans le navigateur. Recharger la page demande une nouvelle image.

Les contours sont estimés à partir des différences de luminance adjacentes. Le masque combine réserves claires, pigment sombre et contours ; son alpha conserve la transparence de l’image. Il utilise le binding de texture déjà disponible dans le moteur de brosses. La couleur initiale d’un nouveau tracé vient d’une cellule photographique, en suivant la position de l’oizo. La forme, les buffers et les shaders artistiques de Voiles sont préservés.

## Transduction sonore

La même grille est transmise au pad source puis aux trois moteurs du mix ambient. L’angle horizontal et la hauteur du dépôt choisissent la cellule explorée. Sa luminosité infléchit le degré musical en restant dans la gamme de l’univers et sélectionne une résonance cristalline ou une corde. Contours et saturation modulent la richesse FM ou l’amortissement Karplus–Strong. Les correspondances sont des décisions artistiques explicites.

L’analyse et la génération de texture ne sont pas exécutées dans la boucle de rendu. À chaque note, la consultation d’une cellule suffit ; la synthèse reste procédurale et native. Les images sont réappliquées après un changement de moteur sonore. La musique ambient peut continuer avant l’import ; c’est la peinture par Voiles qui nécessite l’image.

## Ressources et limites

Le moteur 3D possède la texture. Au remplacement, son mécanisme existant remplace les bindings des traces Voiles déjà présentes puis libère l’ancienne texture. Leur couleur initiale est conservée. Les cartes de profils sont vidées à la destruction. Une demande annulée ou terminée après le démontage libère immédiatement sa texture. Les résultats de décodage obsolètes ne remplacent pas une demande plus récente.

Le prototype ne promet pas la synthèse d’un instrument réaliste à partir d’une photo : il traduit une matière visuelle en paramètres musicaux cohérents. Une audition sur casque, le vrai appareil photo Android/iOS et les fichiers HEIC ne sont pas validés ici. Le redimensionnement carré simplifie le masque et peut modifier les proportions de l’image.

Les tests dédiés couvrent l’import, la demande obligatoire, la vignette, le binding réel au shader, le remplacement, une image invalide et l’absence d’envoi POST. Un AudioContext réel compare deux images et vérifie une modification du spectre sonore ; les mêmes images produisent des couleurs et des alpha différents. La navigation et les moteurs ambient, de résonance et d’audioréactivité sont aussi contrôlés.

Validation exécutée : 15 tests ciblés passent (image, ambient, navigation tactile, résonance et audioréactivité), ainsi que le build Vite, Prettier et `git diff --check`. Le vrai appareil photo et l’écoute sur téléphone/casque physiques n’ont pas été testés.
