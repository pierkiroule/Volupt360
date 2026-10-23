# ÉmoCiel •°

Compose ton ciel émotionnel et traverse-le tranquillement en 360°.

## Un seul parcours

Douze symboles météo, une sélection de un à trois phénomènes, un aperçu circulaire. Entrer ouvre le même monde en plein écran : contempler, voyager, pause, gyroscope et retour à la palette. Le glissement fonctionne sans capteur. Les couleurs sont des choix artistiques, sans analyse psychologique.

L’entrée principale charge uniquement `src/simple`. Les anciens ateliers restent archivés dans les sources et dans Git, mais ne font plus partie du parcours ni du bundle de production. Aucun ancien projet ni fichier utilisateur n’est effacé. La nouvelle sélection utilise sa propre clé locale `cosmo-simple.v1`.

## Rendu borné

`SimpleWorld.ts` utilise Three.js directement : douze îlots répartis dans quatre lots instanciés et déformés au GPU, une géométrie et un atlas procédural 512² partagées, 480 particules mobiles (800 sur ordinateur), un skydome intérieur. Sept appels de dessin, environ 12 800 triangles et cinq silhouettes d’oiseaux, aucun modèle externe, ombre ou post-traitement. Ratio de pixels plafonné à 1,25, abaissé à 0,8 lors de ralentissements prolongés. Les diagnostics DOM sont limités à environ huit actualisations/seconde.

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

`composition.ts` centralise douze signatures : soleil, pluie, vent, brume, orage sans flash, éclaircies, arc-en-ciel, neige, aurore, lune, nuages et averses. Chaque signature règle la vitesse et l’amplitude des voiles, leur silhouette et leur transparence. Le shader de particules conserve des groupes distincts pour chaque symbole : chute verticale ou oblique, ascension, transport horizontal, flottement, ondulations ou étoiles lentes.

Les interactions sont explicites : soleil + pluie réchauffe certaines gouttes et fait émerger une irisation ; vent + pluie incline les averses. Le ciel prend également en compte les éclaircies, la profondeur nocturne, les nuages, la brume, les aurores et une lune discrète. Aucun éclair clignotant. La composition est indépendante de l’ordre de sélection, sans reconstruire les buffers ni ajouter d’appels de dessin. Les anciens identifiants de sélection sont conservés, avec un vocabulaire désormais météorologique ; ils ne sont pas interprétés psychologiquement.

Deux tests complémentaires vérifient les associations et l’ordre des choix, puis rendent les douze mondes et soleil + pluie en contrôlant les erreurs JavaScript/GLSL et le budget de sept appels de dessin. Les captures des compositions sont inspectées. Les contrôles hors ligne ci-dessus datent de la version antérieure du ciel et ne constituent pas une nouvelle mesure sur appareil physique.

## Matières vivantes, altitude et paysage lointain

`WatercolorAtlas.ts` produit quatre familles déterministes de pigments dans un atlas unique 512² : lavis, auréoles, fibres sèches et granulation. Les champs de bruit multi-échelles remplacent les anciennes stries régulières. Les nappes échantillonnent deux zones dérivantes de leur tuile, avec une enveloppe douce et irrégulière ; la transformation reste calculée depuis la matière originale. Une seule génération à l’initialisation, aucun téléchargement.

Le monde de nuages et la caméra sont portés à 18 unités d’altitude. Le voyage reste entre 16,8 et 19,2 unités. Le skydome peint un sol diffus à partir d’un plan virtuel en dessous du vol, avec parallaxe, reliefs lointains estompés et lumière de coucher de soleil ; aucun terrain dense ou filtre de flou plein écran n’est ajouté. Le ciel nocturne et les autres choix météo conservent leur identité.

`DistantBirds.ts` ajoute cinq silhouettes articulées dans un seul lot de segments. Leur passage dure une partie d’un cycle d’environ deux minutes, sans apparition d’objets ni allocations par frame. Les silhouettes, le ciel, les pigments et les particules se figent ensemble sur pause. Nettoyage des buffers et matériaux au démontage.

Deux contrôles supplémentaires vérifient la diversité/reproductibilité des quatre textures, le maintien en altitude, la pause des nouveaux éléments et le budget total de sept appels de dessin. Captures inspectées ; pas de nouvel essai sur téléphone physique.

La sélection météo utilise un double contour contrasté, une coche, un halo fixe et un symbole légèrement agrandi. Une animation brève accompagne le choix et est désactivée lorsque le mouvement réduit est demandé. Les noms des météos choisies sont rappelés sous le disque ; les cibles tactiles restent à 44 pixels. Les pictogrammes de feu et de vagues sont remplacés par éclaircies et averses, sans modifier les identifiants des sauvegardes.

## Transduction picturale de la météo émotionnelle

`materialIdentity.ts` sépare l’identité plastique du simple choix de couleur. Douze recettes définissent une famille de pigments, une silhouette ambiguë, un contraste, un dépôt de pigment, un étalement spatial, une hauteur, une profondeur et une torsion. Les pluies deviennent des nappes verticales denses, le vent des fibres étirées, la brume des espaces diffus, les aurores des voiles courbes et la neige des réserves granuleuses. Chaque composante choisie reste une couche identifiable dans les mélanges.

L’atlas ajoute cellules humides, auréoles, fissures capillaires, fibres et micro-granulation. Trois lectures de la même texture animent lentement des taches et des dégradés internes ; le pigment s’accumule en contours irréguliers. Les six silhouettes ne sont pas des illustrations : elles laissent place aux associations du visiteur. Aucune émotion n’est inférée ni interprétée à partir des choix.

Le nombre de textures, de voiles et d’appels de dessin reste identique. Les lectures de texture supplémentaires augmentent toutefois le coût du fragment shader : la fluidité sur téléphone physique reste à mesurer. Les huit tests du parcours, des douze météos, de l’atlas et du paysage sont réexécutés, avec captures inspectées.

## Archipels d’encre et métamorphoses locales

Les quatre matériaux instancient chacun trois îlots de tailles différentes. Géométrie et atlas sont partagés ; les matrices sont écrites seulement à la composition. Les intervalles vides font partie du paysage, avec de la parallaxe pendant le voyage. Le détail de granulation est modulé par la distance au regard.

Une partie des îlots possède un repli partiellement symétrique, volontairement imparfait. Dépôts sombres d’encre sumi-e, lavis colorés, réserves claires et dégradés internes produisent des taches ambiguës sans silhouette figurative imposée. Des ouvertures locales évoluent sur des cycles différents, de plusieurs dizaines de secondes, indépendamment de la dérive générale et du séchage.

`PigmentDynamics.ts` conserve douze centres de référence et mesure leur proximité en 3D, en tenant compte de la dérive des instances. Deux matières de météo différente qui se rapprochent provoquent un mélange local de couleur, une densification et une diffusion douce. La pluie renforce la diffusion, le vent étire le mélange. Les particules existantes réagissent modestement à ces rencontres ; aucun émetteur supplémentaire n’est créé.

Les contacts utilisent une représentation simplifiée des centres, pas une simulation de fluides ou de collision exacte entre surfaces. Le coût géométrique augmente à environ 12 800 triangles, mais les îlots sont plus petits et le nombre d’appels de dessin reste à sept. Aucune allocation de géométrie ou nouvelle texture dans la boucle ; la qualité adaptative est conservée. Les animations et mélanges se figent en pause.

Un test dédié vérifie l’absence de rencontre entre matières superposées à l’écran mais éloignées en profondeur, la montée progressive et bornée de la réaction, et son gel en pause. Les parcours existants sont également réexécutés. Essai sur téléphone physique et performance prolongée restent à effectuer.
