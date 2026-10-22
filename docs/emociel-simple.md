# ÉmoCiel •°

Compose ton ciel émotionnel et traverse-le tranquillement en 360°.

## Un seul parcours

Douze émotions, une sélection de une à trois couleurs, un aperçu circulaire. Entrer ouvre le même monde en plein écran : contempler, voyager, pause, gyroscope et retour à la palette. Le glissement fonctionne sans capteur. Les couleurs sont des choix artistiques, sans analyse psychologique.

L’entrée principale charge uniquement `src/simple`. Les anciens ateliers restent archivés dans les sources et dans Git, mais ne font plus partie du parcours ni du bundle de production. Aucun ancien projet ni fichier utilisateur n’est effacé. La nouvelle sélection utilise sa propre clé locale `cosmo-simple.v1`.

## Rendu borné

`SimpleWorld.ts` utilise Three.js directement : quatre membranes déformées au GPU, une géométrie et une texture procédurale 256² partagées, 480 particules mobiles (800 sur ordinateur), un skydome intérieur. Six appels de dessin, environ 4 600 triangles, aucun modèle externe, ombre ou post-traitement. Ratio de pixels plafonné à 1,25, abaissé à 0,8 lors de ralentissements prolongés. Les diagnostics DOM sont limités à environ huit actualisations/seconde.

Le voyage suit une ellipse fermée au milieu de la composition. Le glissement et le capteur règlent le regard séparément de la position. Le contrôleur d’horizon existant est réutilisé : pas de roulis, calibration relative, changements d’orientation d’écran et source absolue Android pris en charge. Quatre secondes sans signal rendent la main au tactile. L’autorisation est demandée uniquement au toucher du bouton Gyro.

La boucle s’arrête en arrière-plan et le retour exige une reprise volontaire. La préférence de mouvement réduit démarre en pause. Perte de contexte WebGL : arrêt du rendu et message ; restauration : reprise du même monde. Les ressources et écouteurs sont libérés au démontage. Aucun son ni appel API.

## Vérifications

- Build TypeScript + Vite.
- Quatre tests Chromium : palette mobile, sauvegarde locale, voyage et pause ; calibration gyro sans roulis, repli sans capteur, entrées/sorties répétées ; perte/restauration réelle du contexte WebGL via l’extension de test ; palette de douze émotions sur écran 360 × 640, prise en compte de la troisième couleur, limite de sélection et réduction du mouvement.
- Captures mobiles inspectées.
- Vérification sur le build de production : affichage 360 × 640 sans débordement, rechargement hors ligne avec service worker, sélection conservée et entrée en 360°.

Aucun essai physique sur Android/iOS, aucune garantie de 60 FPS ni mesure de mémoire sur une session prolongée. Les tests historiques concernent les anciens parcours et ne valident pas cette nouvelle entrée.

## Ciel et particules

`Atmosphere.ts` réutilise la texture de matière 256² : deux projections continues de la direction 3D évitent la couture longitudinale d’un panorama. Les lavis du ciel suivent les trois couleurs choisies, sans paysage imposé ni photographie distante. Le dôme accompagne uniquement la position de la caméra.

Un seul `Points` anime les particules au GPU. Pétales abstraits, poussières et micro-éclats nacrés suivent des courants lents, avec apparitions douces. Pas de bloom ni d’addition lumineuse. Les sprites sont plafonnés à 18 pixels multipliés par le ratio de rendu. Le mode de qualité réduit baisse également leur nombre de 35 %. Pause et mouvement réduit figent le ciel, les voiles et les particules ensemble.
