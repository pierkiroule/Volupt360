# OIZO-BULLE •°

On sculpte son ciel émotionnel pour apprendre à le contempler autrement.

Une seule scène aquarelle, six minutes de vol actif de la nuit à l’aube. Les bulles proposent un autre point de vue sur l’œuvre réellement peinte ; elles n’ouvrent pas un décor indépendant. Aucun état émotionnel n’est mesuré, enregistré ou inféré. L’expérience ne revendique pas d’efficacité thérapeutique démontrée.

## Points d’intégration conservés

Le parcours utilise toujours `ChillExperience`, `createSoundNest`, les géométries et alphas des brosses, `createPointFlight` / `SonoizoDance`, l’oiseau articulé, le lecteur Web Audio `createTwigBank`, `experienceTimeline`, `createChillSky`, `createPigmentArchive` et l’export PNG final. Aucune dépendance ajoutée. Les parcours historiques restent accessibles.

## Modules et responsabilités

- `moodBrushes.js` : huit symboles et leurs profils picturaux. Tourbillons et impulsions réutilisent les filaments, la pluie et les éclats les dépôts d’encre, la brume la diffusion, les vagues les voiles, le minéral les strates sèches et le souffle les filaments fins. Les signatures modulent section, courbure, dispersion, taille, opacité, granulation et diffusion. Un neuvième accès `◯` conserve un lavis neutre. Aucun nom d’émotion affiché ; les noms picturaux restent accessibles aux lecteurs d’écran.
- `contemplativePhrases.js` : 24 phrases originales modifiables indépendamment du rendu. Présentation centrale avec fondu sur cinq secondes, sans voix, score ni questionnaire.
- `createBubbleEmergence.js` : seuils de proposition fondés sur les secondes de vol et les dépôts de peinture. Au plus une proposition active ; au plus 24 dans la séance. La bulle reste disponible jusqu’à la rencontre, sans passage obligatoire ni expiration imposée.
- `createContemplationState.js` : état `FLIGHT` / `CONTEMPLATION`, phrase, position, orientation et brosse mémorisées.
- `createVocalBubbles.js` : réutilise la sphère aquarelle, la collision balayée en 3D et la dissolution existantes. L’option `emergence` active le nouveau parcours ; l’ancien fonctionnement reste disponible sans cette option.
- `createCameraRig.js` : approche douce du point de traversée, rotation gyro ou tactile autour de ce point fixe, puis retour amorti à la caméra de suivi.

Les changements de matière dans `brushes.js` et son shader sont optionnels. Leurs valeurs par défaut préservent les profils antérieurs. Les alphas sont générés au chargement des profils, jamais dans la boucle de rendu.

## Apparition d’une bulle

Seuils initiaux configurables : 12 secondes de vol et 12 dépôts pour la première, puis au moins 10 secondes après la reprise et six nouveaux dépôts. Après 35 secondes de vol sans nouveaux dépôts, une proposition peut émerger si une peinture existe déjà. Il n’y a donc aucune obligation de peindre continuellement. Le fondu d’apparition dure quatre secondes.

Une bulle reprend la teinte du dernier pigment et émerge près de ce dépôt, approximativement neuf unités devant l’oiseau, jamais directement sur lui. Elle dérive légèrement. La recherche du prochain objectif de vol ne considère que la proposition disponible. Le pilotage manuel garde la priorité.

La collision balaie le déplacement relatif de l’oiseau et de la sphère ; une intersection apparente à l’écran ne suffit pas. Un verrou protège le traitement asynchrone, puis la bulle visitée reste verrouillée jusqu’à la sortie. À la reprise, elle se dissout et libère la possibilité d’une proposition ultérieure.

## Contemplation et reprise

La rencontre termine proprement le dépôt tactile en cours, mémorise la pose et la brosse, suspend le vol et la timeline, et approche la caméra de la position de traversée en 1,2 seconde. Après cette transition, seul le regard tourne : ni translation du point de vue, ni rotation de l’œuvre, ni dessin. L’oiseau est masqué depuis cette vue subjective, son état de vol reste conservé.

Une case facultative, activée par défaut sur l’accueil, permet de demander explicitement l’autorisation d’orientation au toucher du bouton de départ. En cas de refus, d’absence de capteur ou de choix de ne pas l’utiliser, le glissement tactile fonctionne. Aucun sélecteur gyro général n’est proposé pendant le vol. Les événements `deviceorientation` et `deviceorientationabsolute` sont pris en charge ; le premier flux valide est conservé pendant la contemplation pour éviter les sauts entre deux référentiels. Les états `ready`, `waiting`, `active`, `denied`, `unavailable`, `insecure` et `disabled` sont exposés sur le canvas pour le diagnostic. Un capteur dont le cap alpha est absent peut encore piloter l’inclinaison.

Pendant la contemplation, seuls la phrase temporaire et « Reprendre le vol » sont affichés. Le bouton reste immédiatement utilisable, sans durée minimale. La reprise conserve les pigments, restaure la brosse et réactive le toucher sans attendre le retour visuel de la caméra.

## Horloge et musique

Le temps d’écoute dans une bulle ne consomme aucune des 360 secondes de vol. Le contrôleur ignore l’avancée audio pendant cet arrêt et réinitialise sa référence à la reprise. La musique ne s’interrompt pas ; elle boucle pour pouvoir couvrir une durée de contemplation libre, puis s’atténue au départ final. Une fin de piste ne peut plus forcer artificiellement l’horloge à six minutes.

`public/ambiances/gravity.mp3` est désormais fourni et sélectionné en priorité : « Sans gravité », respectablejazzpunk919, environ 208 secondes. Le fichier a été récupéré depuis main. Il boucle pendant le vol et les contemplations, avec le fondu final et l’analyse audio existants. Aucune piste musicale n’a été créée. Un MP3 indisponible laisse fonctionner l’expérience silencieusement.

## Mémoire, final et retour en arrière

L’archive de pigments persistants, les huit dépôts humides récents et les buffers bornés des particules sont conservés. Ni une bulle ni une phase ne nettoient la peinture pour représenter une « amélioration » émotionnelle.

Le final de huit secondes après les six minutes actives et l’export PNG HD restent disponibles ; aucun outil de capture n’est ajouté à la contemplation. Quitter ou démonter la scène libère les ressources et écouteurs existants. Les géométries des 24 bulles partagent une seule sphère, et une seule proposition est rendue à la fois.

La branche isole cette évolution. Au niveau moteur, `resonanceBubbles: false` désactive les nouveaux états et la proposition séquentielle ; les anciens fragments et profils peuvent être réinjectés sans réécrire le rendu. Revenir au commit précédent restitue l’ensemble du parcours antérieur.

## Vérifications

Les suites ciblées testent les seuils de proposition, le plafond de 24, les vrais contacts 3D et les faux croisements en profondeur, le verrouillage des contacts, la dissolution à la sortie, deux contemplations successives et la reprise tactile immédiate. Les tests navigateur vérifient la pause de l’horloge et de la peinture, la continuité audio, le point de vue fixe avec rotation tactile, le refus du gyroscope, les événements de capteur simulés et la suppression de leur écouteur. Les huit signatures produisent des géométries différentes et sont rendues sans erreur WebGL.

Les contrôles de régression incluent les phases à 60/180 secondes, la persistance de la peinture, l’absence de MP3, les interruptions audio, le final, le PNG, le vol et les alphas aquarelle. La séance longue est accélérée et la charge de peinture synthétique : ces essais ne constituent pas une validation sur téléphone physique ni une évaluation clinique. Le confort réel, les capteurs et les interruptions système restent à vérifier sur Chrome Android et Safari iOS.

Résultat de cette livraison : **24 tests ciblés réussis**, build Vite réussi, format Prettier et `git diff --check` sans erreur. Commande :

```sh
CI=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test -- tests/oizo-bulle.spec.js tests/six-minute-experience.spec.js tests/point-flight.spec.js tests/living-pigments.spec.js tests/watercolor-alpha.spec.js tests/oizo-chill.spec.js tests/haikuarelle.spec.js
```

## Évolution picturale et outils compacts

Les huit gestes et le lavis neutre utilisent désormais des pictogrammes SVG dessinés dans `ToolIcon.jsx`, sans emojis. La barre basse est centrée, repliable et regroupe brosses, pause/reprise, son et sortie. Les boutons ne montrent que leurs pictogrammes, avec des noms accessibles et des infobulles ; le volume se déplie à la demande. La contemplation conserve son unique commande de reprise, elle aussi représentée par un pictogramme.

Le skydome unique passe progressivement du noir étoilé avec un croissant jaune ivoire au violet, au bleu avec aurores diffuses, au lever rouge-orangé, aux lavis rose-jaune puis au papier blanc cassé avec un soleil blanc discret. Lune et soleil sont des réserves pigmentaires aux bords doux dans le shader existant, sans bloom ni nouvelles textures GPU. Les motifs restent sphériques, sans couture UV ajoutée.

Les plaques alpha procédurales ajoutent des ramifications capillaires, doubles lisières de séchage et petites réserves de sel. Le shader renforce le grain et les dépôts fins au séchage ; le geste tourbillonnant module aussi sa section avec l’énergie sonore. Ces détails sont calculés dans les alphas au chargement et dans les matériaux existants, sans nouveau moteur de peinture.

Au terme de la traversée, les dépôts humides restants rejoignent l’archive de leurs géométries originales. Tous les matériaux de l’archive passent à une humidité nulle et une réponse audio nulle ; les particules transitoires sont masquées. L’œuvre conserve ses couleurs et ses alphas, tandis que la matière devient sèche et statique. Le PNG HD continue à capturer uniquement le rendu Three.js, sans la barre d’outils.

La suite `pictorial-sky-toolbar.spec.js` vérifie le centrage, les SVG, le repli/dépli, le volume, la sélection et l’absence de débordement. Elle mesure aussi les couleurs des étapes célestes sur un rendu WebGL. Le test du final dépose réellement de la peinture avant de vérifier son archivage sec et de décoder le PNG.

Validation de cette évolution graphique : **28 tests ciblés réussis**, comprenant la barre mobile, le cycle céleste, le final sec/PNG et les régressions vol, gyro, bulles, timeline et pigments. Les essais restent effectués sous Chromium avec capteurs simulés ; le téléphone physique n’a pas été testé.

## Sillages des ailes

Le dépôt part désormais des deux pointes d’ailes articulées, et non de la queue. `createOizo.getWingPosition` échantillonne le sommet réel du maillage déformé par les os, puis le ramène dans le repère du paysage : battements, virages, montée et plongée déplacent naturellement les émetteurs.

`createSoundNest` conserve deux historiques de tracé par brosse, gauche et droite. Les positions ne sont jamais alternées dans un même ruban, ce qui évite les ponts entre les ailes. Relâcher, changer de brosse ou entrer dans une bulle termine les deux flux. Le contact reste immédiat ; l’échantillonnage courant est réparti à 15 Hz par aile pour environ 30 dépôts par seconde au total. Les brosses, alphas, déploiement humide, archivage sec et export sont réutilisés. L’ancien accesseur de queue reste disponible pour compatibilité, mais n’est plus appelé par le moteur de dépôt.

`wing-emission.spec.js` vérifie les pointes réelles du rig dans un paysage transformé, leur mouvement pendant les battements, les deux dépôts immédiats indépendants et leur fermeture au changement de brosse.

## Acrobaties peintes

Trois commandes triangulaires au-dessus des matières déclenchent une boucle céleste (8 s), une spirale avec roulis (8 s) ou un ruban infini (9 s). La figure utilise la brosse sélectionnée et les deux émetteurs d’ailes existants ; changer de matière pendant une figure reste possible. Les commandes ne se cumulent pas.

`createFlightAcrobatics` fournit des directions et un repère continu au contrôleur de vol, sans jamais assigner de position : le déplacement est intégré par le moteur existant, sans téléportation. Le rig suit l’inversion de la boucle et amortit le roulis. Pendant une figure, la caméra prend légèrement du recul et observe l’oiseau depuis un point stable, puis rejoint progressivement le suivi habituel. Elle ne roule pas avec l’oiseau.

Le dépôt est automatique pendant la figure puis se termine sur les deux ailes. Un toucher du ciel interrompt immédiatement l’acrobatie et reprend le dessin manuel. Pause et reprise suspendent aussi la figure et les dépôts. Les bulles ne déclenchent pas de contemplation au milieu d’une acrobatie ; le final interrompt proprement la figure avant son départ.

Les contrôles `painted-acrobatics.spec.js` vérifient les trois trajectoires distinctes, la continuité des positions, la pause, l’interruption manuelle et la peinture depuis les ailes avec la brosse courante. Les figures nécessitent encore une évaluation du confort sur téléphone physique.

Validation des acrobaties : 19 tests ciblés validés, dont deux contrôles relancés après correction de leur synchronisation avec les états prêts de l’interface. Build Vite, format et vérification du diff réussis. Les essais couvrent Chromium mobile émulé, pas un téléphone physique.
