# Squibble360 — Univers d’encre audioreactif

Le disque et les douze brosses sont conservés. Dans la visite, le terrain est remplacé par des voiles suspendus qui reprennent les coordonnées du dessin, avec courbures et déploiement vertical. Aucun relief terrestre ni plan de sol n'est créé dans cette scène. Le papier aquarelle, les textures locales, la musique et l'export PNG restent utilisés.

`AudioInkUniverse.jsx` adapte les traits au moteur `createLivingRibbons` existant. Chaque brosse dispose maintenant de sa propre case dans un atlas de douze textures, évitant les collisions entre deux emojis partageant auparavant la même famille. Taille et opacité sont conservées dans la matière spatiale. Les touches isolées deviennent de petits plis circulaires.

- Graves : ampleur locale des voiles et dérive des pigments.
- Médiums : ondulation des voiles et des filaments.
- Aigus : détails et déplacement des grains.
- Transitoires : accent de dépôt discret.

Les bandes Web Audio sont lissées avec des interpolations indépendantes du framerate. La pause fige aussi l'état de réactivité. La musique se lance explicitement via le bouton lecture ; sans musique, la scène conserve une dérive lente, sans prétendre analyser un signal inexistant.

La navigation est volumique, avec gyroscope ou glissement tactile et rappel vers l'intérieur de l'œuvre. Les calculs des trajectoires et les textures restent hors de la boucle de rendu. Maximum 80 voiles, 1 400 grains et 72 filaments sur petit écran ; ressources GPU libérées au démontage. Aucun post-traitement lourd ni dépendance supplémentaire.

Limites : cette version ne contient ni simulation physique des fluides ni mode WebXR. Tests dans Chromium/SwiftShader, tactile et capteurs simulés ; fluidité et confort restent à vérifier sur téléphone réel. Les noms historiques des fichiers de disque sont conservés pour limiter les changements ; le moteur de terrain antérieur reste disponible dans le dépôt.

## Images visibles dans la scène

`createImageVeils.js` expose aussi les images locales comme des feuillets photographiques ouverts, aux bords diffus. Les originaux décodés depuis `public/textures` et les compositions des brosses sont réutilisés, sans nouveaux téléchargements dans la boucle de rendu. Maximum huit feuillets, une géométrie partagée, textures et matériaux libérés au remplacement et au démontage. Le centre conserve les couleurs et les détails des images ; seules les bordures et la courbure sont aquarellées. Aucun retour des bulles photo.
