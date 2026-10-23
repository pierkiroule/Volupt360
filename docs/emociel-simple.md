# ÉmoCiel •°

Compose ton ciel émotionnel et traverse-le tranquillement en 360°.

## Un seul parcours

Douze symboles météo, une sélection de un à trois phénomènes, un aperçu circulaire. Entrer ouvre le même monde en plein écran : contempler, voyager, pause, gyroscope et retour à la palette. Le glissement fonctionne sans capteur. Les couleurs sont des choix artistiques, sans analyse psychologique.

L’entrée principale charge uniquement `src/simple`. Les anciens ateliers restent archivés dans les sources et dans Git, mais ne font plus partie du parcours ni du bundle de production. Aucun ancien projet ni fichier utilisateur n’est effacé. La nouvelle sélection utilise sa propre clé locale `cosmo-simple.v1`.

## Rendu borné

`SimpleWorld.ts` utilise Three.js directement : quatre membranes déformées au GPU, une géométrie et un atlas procédural 512² partagées, 480 particules mobiles (800 sur ordinateur), un skydome intérieur. Sept appels de dessin, environ 4 600 triangles et cinq silhouettes d’oiseaux, aucun modèle externe, ombre ou post-traitement. Ratio de pixels plafonné à 1,25, abaissé à 0,8 lors de ralentissements prolongés. Les diagnostics DOM sont limités à environ huit actualisations/seconde.

Le voyage suit une ellipse fermée au milieu de la composition. Le glissement et le capteur règlent le regard séparément de la position. Le contrôleur d’horizon existant est réutilisé : pas de roulis, calibration relative, changements d’orientation d’écran et source absolue Android pris en charge. Quatre secondes sans signal rendent la main au tactile. L’autorisation est demandée uniquement au toucher du bouton Gyro.

La boucle s’arrête en arrière-plan et le retour exige une reprise volontaire. La préférence de mouvement réduit démarre en pause. Perte de contexte WebGL : arrêt du rendu et message ; restauration : reprise du même monde. Les ressources et écouteurs sont libérés au démontage. Aucun son ni appel API.

## Vérifications

- Build TypeScript + Vite.
- Quatre tests Chromium : palette mobile, sauvegarde locale, voyage et pause ; calibration gyro sans roulis, repli sans capteur, entrées/sorties répétées ; perte/restauration réelle du contexte WebGL via l’extension de test ; palette de douze symboles sur écran 360 × 640, prise en compte de la troisième couleur, limite de sélection et réduction du mouvement.
- Captures mobiles inspectées.
- Vérification sur le build de production : affichage 360 × 640 sans débordement, rechargement hors ligne avec service worker, sélection conservée et entrée en 360°.

Aucun essai physique sur Android/iOS, aucune garantie de 60 FPS ni mesure de mémoire sur une session prolongée. Les tests historiques concernent les anciens parcours et ne valident pas cette nouvelle entrée.

## Ciel et particules

`Atmosphere.ts` réutilise la atlas de matière 512² : deux projections continues de la direction 3D évitent la couture longitudinale d’un panorama. Les lavis du ciel suivent les trois couleurs choisies, sans paysage imposé ni photographie distante. Le dôme accompagne uniquement la position de la caméra.

Un seul `Points` anime les particules au GPU. Pétales abstraits, poussières et micro-éclats nacrés suivent des courants lents, avec apparitions douces. Pas de bloom ni d’addition lumineuse. Les sprites sont plafonnés à 20 pixels multipliés par le ratio de rendu. Le mode de qualité réduit baisse également leur nombre de 35 %. Pause et mouvement réduit figent le ciel, les voiles et les particules ensemble.

## Composition météorologique

`composition.ts` centralise douze signatures : soleil, pluie, vent, brume, orage sans flash, braises, arc-en-ciel, neige, aurore, lune, nuages et vagues. Chaque signature règle la vitesse et l’amplitude des voiles, leur silhouette et leur transparence. Le shader de particules conserve des groupes distincts pour chaque symbole : chute verticale ou oblique, ascension, transport horizontal, flottement, ondulations ou étoiles lentes.

Les interactions sont explicites : soleil + pluie réchauffe certaines gouttes et fait émerger une irisation ; vent + pluie incline les averses. Le ciel prend également en compte les éclaircies, la profondeur nocturne, les nuages, la brume, les aurores et une lune discrète. Aucun éclair clignotant. La composition est indépendante de l’ordre de sélection, sans reconstruire les buffers ni ajouter d’appels de dessin. Les anciens identifiants de sélection sont conservés, avec un vocabulaire désormais météorologique ; ils ne sont pas interprétés psychologiquement.

Deux tests complémentaires vérifient les associations et l’ordre des choix, puis rendent les douze mondes et soleil + pluie en contrôlant les erreurs JavaScript/GLSL et le budget de sept appels de dessin. Les captures des compositions sont inspectées. Les contrôles hors ligne ci-dessus datent de la version antérieure du ciel et ne constituent pas une nouvelle mesure sur appareil physique.

## Matières vivantes, altitude et paysage lointain

`WatercolorAtlas.ts` produit quatre familles déterministes de pigments dans un atlas unique 512² : lavis, auréoles, fibres sèches et granulation. Les champs de bruit multi-échelles remplacent les anciennes stries régulières. Les nappes échantillonnent deux zones dérivantes de leur tuile, avec une enveloppe douce et irrégulière ; la transformation reste calculée depuis la matière originale. Une seule génération à l’initialisation, aucun téléchargement.

Le monde de nuages et la caméra sont portés à 18 unités d’altitude. Le voyage reste entre 16,8 et 19,2 unités. Le skydome peint un sol diffus à partir d’un plan virtuel en dessous du vol, avec parallaxe, reliefs lointains estompés et lumière de coucher de soleil ; aucun terrain dense ou filtre de flou plein écran n’est ajouté. Le ciel nocturne et les autres choix météo conservent leur identité.

`DistantBirds.ts` ajoute cinq silhouettes articulées dans un seul lot de segments. Leur passage dure une partie d’un cycle d’environ deux minutes, sans apparition d’objets ni allocations par frame. Les silhouettes, le ciel, les pigments et les particules se figent ensemble sur pause. Nettoyage des buffers et matériaux au démontage.

Deux contrôles supplémentaires vérifient la diversité/reproductibilité des quatre textures, le maintien en altitude, la pause des nouveaux éléments et le budget total de sept appels de dessin. Captures inspectées ; pas de nouvel essai sur téléphone physique.
