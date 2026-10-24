# ÉmoCiel •°

Compose ton ciel émotionnel et traverse-le tranquillement en 360°.

## Un seul parcours

Douze symboles météo, une sélection de un à trois phénomènes, un aperçu circulaire. Entrer ouvre le même monde en plein écran : contempler, voyager, pause, gyroscope et retour à la palette. Le glissement fonctionne sans capteur. Les couleurs sont des choix artistiques, sans analyse psychologique.

L’entrée principale charge uniquement `src/simple`. Les anciens ateliers restent archivés dans les sources et dans Git, mais ne font plus partie du parcours ni du bundle de production. Aucun ancien projet ni fichier utilisateur n’est effacé. La nouvelle sélection utilise sa propre clé locale `cosmo-simple.v1`.

## Rendu borné

`SimpleWorld.ts` utilise Three.js directement : douze îlots répartis dans quatre lots instanciés et déformés au GPU, une géométrie et un atlas procédural 512² partagées, 480 particules mobiles (800 sur ordinateur), un skydome intérieur. Neuf appels de dessin dans l’aperçu, dix dans l’immersion avec les mots, onze lorsque les photographies sont disponibles, environ 14 000 triangles et cinq silhouettes d’oiseaux, aucun modèle externe, ombre ou post-traitement. Ratio de pixels plafonné à 1,25, abaissé à 0,8 lors de ralentissements prolongés. Les diagnostics DOM sont limités à environ huit actualisations/seconde.

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

## Accents visibles et phénomènes groupés

`WeatherAccents.ts` ajoute deux lots GPU : douze traînées pigmentaires courbes et 384 particules groupées sur mobile (640 sur ordinateur). Les trajectoires suivent les météos choisies : ascendantes, descendantes, transportées par le vent ou en orbites lentes. Les fragments prennent des formes de pétales abstraits, taches et membranes d’encre, texturées avec le même atlas. Ils se déploient en grappes puis se dissipent, avec des cycles désynchronisés de 19 à 36 secondes.

Leur contraste et leur taille dépassent ceux des poussières atmosphériques : sprites plafonnés à 32 pixels multipliés par le ratio de rendu. Les traînées sont des bandes étroites, translucides et effilées, sans bloom ni flash. Les pauses et le mouvement réduit figent également ces deux nouvelles couches. Les rencontres de pigments influencent légèrement le mouvement des grappes.

Coût : deux appels supplémentaires (neuf au total), environ 1 150 triangles de rubans et un nombre fixe de particules. Aucun objet n’est créé au cours d’une émission ; buffers et matériaux sont réutilisés, puis libérés au démontage. La qualité réduite retire 35 % des particules de ces grappes. Ce budget est plus élevé que la version précédente : le rendu sur téléphone physique reste à mesurer.

Les neuf tests existants sont réexécutés avec le nouveau budget, notamment les douze météos, le gyro simulé, la pause et la restauration WebGL ; captures mobiles inspectées.

## Mots en résonance et regard

`ResonantWords.ts` contient un vocabulaire éditable associé aux douze météos. Six mots au maximum se répartissent dans l’espace : deux par météo si trois sont choisies, davantage de nuances d’un même vocabulaire si une seule est choisie. Aucun mot n’interprète le visiteur et aucune consigne psychologique n’est générée.

Les mots flottent lentement et font face au regard. Un centrage pendant environ 320 ms sélectionne un seul mot ; il se rapproche progressivement, avec une distance minimale de 2,8 unités. Quand le regard s’éloigne, il retrouve doucement sa place. Une zone de maintien plus large évite le tremblement de sélection. La caméra ne bouge pas en réponse aux mots. Leur largeur apparente est plafonnée pour rester dans le champ sur mobile.

Un atlas texte 1024×512, douze triangles et un lot de rendu sont partagés par les six mots. Le texte est sombre avec un contour ivoire. Il apparaît seulement dans l’immersion : dix appels de dessin au total, neuf dans l’aperçu. Pause et mouvement réduit conservent le texte lisible mais suspendent le rapprochement et la dérive. L’atlas est redessiné à la composition et seule la case du mot renouvelé est repeinte après son effacement ; ressources libérées au démontage.

Deux tests vérifient le rapprochement, le retour, le gel en pause, le maintien de la caméra, le vocabulaire et la disparition sur retour à la palette, en complément des neuf contrôles existants. Capture inspectée ; téléphone physique toujours non testé.

### Halos pétillants des mots

Le matériau du texte compose un halo coloré diffus et six petites étincelles orbitales, renforcés par le rapprochement du mot. La variation de brillance est lente et continue, sans flash. Le texte sombre et son contour ivoire restent au premier plan. Les bords du halo sont estompés pour éviter un rectangle visible.

Le fragment shader calcule l’étincelle la plus proche au lieu de parcourir les six, et utilise le même atlas et le même lot de texte : aucun appel de dessin ou ressource GPU supplémentaire. Le temps commun fige aussi les halos en pause et en mouvement réduit. Build et huit tests du texte, du parcours, du gyro simulé et des douze météos sont exécutés ; performance physique mobile non mesurée.

### Météos reconnaissables dans les accents

Les traînées et particules distinguent maintenant explicitement les filets de pluie (et averses), les flocons à six branches, les courants horizontaux du vent et les arcs-en-ciel multicolores en 3D. Vent + pluie incline aussi les gouttes des grappes. Soleil + pluie réserve deux traînées aux arcs-en-ciel, tout en conservant les autres phénomènes. La neige utilise une palette froide et des particules blanchies. Même nombre de buffers et d’appels de dessin.

Les captures des douze météos incluent pluie, vent, neige et arc-en-ciel. Le halo des mots épouse la largeur réelle du texte pour rester proche des lettres, quelle que soit la longueur du mot.

### Vocabulaire évolutif

`weatherWords.ts` centralise 192 mots (16 par météo), éditables indépendamment du rendu. Les six positions se renouvellent à des rythmes décalés : premier changement après 22 à 42 secondes de présence, puis 24 à 42 secondes entre transitions. Chaque emplacement reste associé à sa météo.

Un mot s’efface pendant environ 1,6 seconde, sa case d’atlas est repeinte une fois quand il est invisible, puis le nouveau mot apparaît sur 2,2 secondes. Texte et halo partagent le fondu. Le parcours circulaire du vocabulaire évite les répétitions immédiates et les doublons parmi les six mots visibles. Aucun nouveau matériau, texture ou lot de rendu n’est créé.

Un mot ciblé par le regard ou encore en retour vers sa position est protégé du renouvellement. Pause, mouvement réduit et retour à la palette suspendent les compteurs. Un test simule plus de 110 secondes pour vérifier renouvellement, fondu, échange invisible, stabilité du mot regardé, diversité et absence de modification d’atlas pendant la pause. Les tests de rapprochement et des douze météos sont également exécutés ; aucun test prolongé sur téléphone physique.

## Photographies de nature en disques flottants

`naturePhotos.ts` interroge l’API publique Wikimedia Commons sans clé, avec une recherche de nature propre à chaque météo. Jusqu’à trois recherches sont combinées pour former une sélection de six photos au maximum. Les URLs des fichiers proviennent uniquement des réponses de l’API. Images bitmap uniquement, taille minimale, domaines de média vérifiés, licences CC BY / CC BY-SA / CC0 / domaine public identifiées ; les fichiers sans licence reconnue et ceux sans attribution disponible lorsqu’elle est nécessaire sont ignorés. Les métadonnées HTML sont converties en texte, jamais injectées.

Métadonnées : cache mémoire borné à vingt-quatre recherches, durée maximale de 24 heures pendant la visite. Vignettes : cache HTTP du navigateur. Trois téléchargements simultanés au maximum, délai de 6,5 secondes par recherche et budget global de 18 secondes, annulation lors de la sortie, essais de candidats suivants en cas de CORS/erreur de décodage. Les bitmaps sont fermés après copie dans l’atlas. Pas de garantie de disponibilité hors ligne des photographies.

`NatureDiscs.ts` recadre les images dans un atlas 768×512 et dessine six disques aux bords adoucis en un seul lot. Ils circulent lentement dans l’espace, avec une opacité de 0,4. Pause et mouvement réduit les figent. En l’absence de photos, le ciel reste fonctionnel avec dix appels de dessin ; avec photos, onze. Pas de source distante bloquante pour le démarrage de la scène.

Le petit bouton « Sources des images » expose les titres, auteurs, pages d’origine, liens des licences et les modifications de recadrage/transparence. Les crédits concernent uniquement les images effectivement affichées. Le contenu du panneau reste textuel ; le bouton dispose d’une zone tactile de 44 pixels. Une panne présente un réessai discret.

Validation : quatre tests réseau simulés couvrent six images et leurs crédits, cache des métadonnées, panne/reprise, filtrage des licences et URLs, et vignette bloquée. Les douze autres tests de mots, navigation, ciel, pigments et gyro simulé sont réexécutés. Les images du scénario de test sont des fixtures locales ; le téléchargement de vraies photographies Commons n’a pas pu être vérifié ici : la connexion directe à Commons retourne une erreur de proxy 403, y compris après tentative avec permissions étendues. Validation sur le déploiement et sur téléphone réel nécessaire.

### Photos variées et recherches de secours

Chaque météo dispose de trois recherches successives, de la plus précise à une thématique plus large. Chaque requête récupère jusqu’à 24 candidats. Si les images exploitables ou nouvelles ne suffisent pas, le chargement explore le niveau suivant, notamment après des erreurs de vignette. Une indisponibilité totale du service arrête ces recherches ; la scène reste disponible.

Les candidats sont mélangés à chaque ouverture. Un historique local borné retient les douze dernières images de chaque composition, pour douze compositions au maximum. Ces images sont dépriorisées : elles ne sont réutilisées que si les recherches thématiques ne fournissent pas assez de nouveautés. Le cache conserve les candidats, pas une sélection figée. Les recherches vides sont mises en cache une minute, les résultats positifs jusqu’à 24 heures pendant la visite.

Deux nouveaux tests simulés vérifient une recherche initiale vide suivie d’un résultat thématique, et trois ouvertures avec les mêmes météos donnant dix-huit photos distinctes. Si Commons est indisponible ou si toutes les recherches ne proposent que les mêmes fichiers, une nouveauté absolue ne peut pas être garantie. Aucun téléchargement réel n’a pu être validé depuis le proxy de cet environnement.

### Filtre aquarelle des photographies

Le matériau des disques applique une diffusion locale des couleurs, des paliers chromatiques légèrement fondus, une accumulation de pigment sur les contours et une granulation issue de l’atlas du ciel. Les limites du disque sont irrégulières et estompées. Les échantillons restent à l’intérieur de leur case d’atlas pour éviter les débordements d’une photo sur une autre. Les sources restent reconnaissables ; aucun nouveau fichier modifié n’est enregistré.

Le filtre ajoute des lectures de texture, mais aucun lot, matériau ou texture supplémentaire. Les crédits indiquent aussi l’application du filtre. Validation : build TypeScript/Vite et six tests des images (réponses réseau simulées), sans mesure sur téléphone physique.

### Rencontres picturales et voyage — évolution

- `NatureDiscs` conserve son atlas de six photographies et une seule passe GPU. Le masque rond est remplacé par une empreinte pigmentaire irrégulière : réserves de papier, bord capillaire, auréole et mélange avec la palette météo. Un cycle lent fait émerger les détails photographiques sans flash. Les crédits et les contrôles réseau restent inchangés.
- `composeWeather().encounters` décrit trois rencontres indépendantes et combinables : soleil/pluie, vent/neige et brume/lune. Les shaders des lavis traduisent ces associations en ouvertures dorées, stries claires et nuances argentées, sans supprimer les identités individuelles.
- `TravelPath` fournit un parcours fermé analytique et un point de regard intérieur, sans allocation par frame. Le voyage alterne proximité et recul ; le regard tactile/gyro reste relatif et indépendant. Le bouton Voyager permet toujours d'arrêter la translation et Pause suspend l'animation.
- Aucun nouvel asset, dépendance ni appel de rendu. Les empreintes photographiques sont plus grandes : leur coût de transparence doit encore être évalué sur téléphone physique. Les photographies des tests sont des fixtures, pas une validation du service Commons réel.

### Remplacement des photographies par des résonances abstraites

Cette section remplace les descriptions photographiques précédentes : Commons, le chargement d’images et les crédits ont été retirés de l’expérience active. Les modules et tests photographiques ont été supprimés.

`AbstractResonances` compose six membranes spatiales dans une géométrie unique (6 144 triangles, une passe recto-verso). Un shader reconstruit les plis depuis une grille immuable ; aucune simulation cumulative ni allocation par frame. Les profils météo dessinent des rubans solaires, des coulures verticales, des tissus étirés par le vent, des membranes brumeuses et des voiles d’aurore. Le grain partagé, les réserves et les auréoles évitent les surfaces pleines et lisses. Les associations météo modulent aussi les pigments. La rotation du regard révèle de vrais volumes ouverts, pas des images face caméra.

Pause et réduction du mouvement utilisent l’horloge existante. Le module libère sa géométrie et son matériau sans détruire l’atlas partagé. Les contrôles, le voyage, les mots et le gyroscope sont conservés. Budget : 9 passes en aperçu, 11 en immersion. Aucune dépendance supplémentaire. Les performances sur téléphone physique restent à mesurer.

### Fragments poétiques

`poeticFragments.ts` remplace le lexique de mots : 72 fragments originaux (six par météo), plus neuf fragments d’associations. La sélection est indépendante de l’ordre des émojis et privilégie d’abord les rencontres disponibles. Aucune interprétation psychologique n’est produite.

Le même atlas contient six emplacements, mais un seul est visible : apparition sur trois secondes, lecture jusqu’à quinze secondes, disparition jusqu’à dix-huit secondes, puis quatorze secondes sans texte. Le prochain fragment est peint uniquement lorsqu’il est invisible. Composition typographique en une ou deux lignes, ajustement réel de la taille sans compression horizontale. Le regard rapproche le fragment ; la caméra reste indépendante. Pause suspend le cycle ; en réduction du mouvement, un fragment reste lisible et immobile. Ressources et nombre de passes inchangés.

### Musique échantillonnée locale

- `WeatherScore` : partition déterministe par seed, 12 profils météo, voix liées par une gamme commune ré/fa/sol/la/do, conduite mélodique, motif mémorisé avec mutations, horloges instrumentales indépendantes et silences. Aucun générateur distant. Les paramètres sont des choix artistiques, sans inférence émotionnelle.
- `WeatherMusic` : trois instruments `smplr` (piano, bois et vibraphone frotté), neuf samples VCSL réels, 32 kHz mono Vorbis (~0,5 Mo). Les hauteurs de référence ont été vérifiées par analyse spectrale : les noms VCSL utilisent une autre convention d’octave que les noms MIDI. Normalisation de crête, filtre doux, réverbération stéréo générée une fois, compression et fondus de gain. Panoramique interpolé pour les notes futures et les résonances en cours.
- Chargement uniquement après activation volontaire via ♫. Une instance partagée par atelier ; échec récupérable, pause en sortie de scène ou arrière-plan, suspension du contexte après fondu. Reprise volontaire. Volume et silence accessibles. Nettoyage des sources, timers, nœuds et contexte au démontage.
- Les samples et leurs licences sont dans `public/audio/emociel`. `sources.json` conserve le dépôt, le commit et les chemins originaux ; `CC0.txt` contient la licence. Le service worker précache les neuf fichiers et inclut leur contenu dans la version du cache. Pas de serveur de samples distant à l’exécution.

Vérifications : compilation et tests navigateur de décodage des vrais OGG, signal non nul mesuré en sortie du moteur `smplr`, pause/suspension/reprise/fermeture, activation volontaire, volume, erreurs et retry. Une simulation de partition de trente minutes vérifie reproductibilité, gamme et densité bornée ; ce n’est pas un test d’écoute réel de trente minutes. L’équilibre artistique à l’écoute, les interruptions spécifiques à Android/iOS et la charge sur téléphone physique restent à valider.

Vérification supplémentaire effectuée sur le build de production : service worker activé, neuf samples présents dans le cache, passage hors ligne, rechargement puis activation musicale réussie. Les quatre tests du contrôle 3D existant ont également passé lors de l’intégration.
