# Matières picturales vivantes

## Palette et fond

Le parcours principal présente six matières abstraites : Lavis, Brosse sèche, Encre fine, Éclaboussures, Diffusion et Tampons. `landscapePalette` définit leurs couleurs, épaisseurs et textures. Les familles existantes sont réutilisées ; Tampons utilise les dépôts plans des taches avec une matière colorée, sans silhouette végétale. Le masque sec ajoute des réserves anisotropes et un grain de papier. Les shaders ajoutent le détail fin et la diffusion.

Le fond est le papier uniforme `#f4f0e8`. Le skydome crépusculaire n’est plus instancié ni chargé par ce moteur. Les surprises décoratives ne sont plus appliquées aux dépôts. Un appui long (ou F2 / Majuscule + Entrée) ouvre un éditeur : couleur, taille, opacité et masque alpha local. Les réglages affectent les nouveaux dépôts ; les précédents conservent leur apparence. Les textures remplacées restent référencées tant que des dépôts les utilisent, puis sont libérées. La remise à zéro et le démontage libèrent aussi ces références. Les réglages sont propres à la session.

## Évolution de la matière

`createPictorialFlow` anime les dépôts terminés avec un champ lent et déterministe d’attracteurs mouvants. Une vitesse amortie conduit vers une cible bornée, dont l’amplitude varie avec les basses et l’énergie du MP3. La dérive est limitée à 3,5 unités ; une faible rotation apparaît progressivement autour du centre propre du dépôt. Les déformations locales se font dans le vertex shader. La géométrie et les masques ne sont pas reconstruits pendant l’animation.

Les gestes en cours restent attachés au sillage. Les bornes de chaque dépôt suivent sa transformation, pour conserver un cadrage cohérent. Les états sont stockés dans une WeakMap : ils deviennent récupérables avec les traces supprimées. La dissolution continue pendant la contemplation, avec un plafond de 56 traces sur mobile et 80 sur ordinateur. Le mode Photo fige les forces, les matières et la dissolution.

Le parcours fixe ne prépare plus les 24 textures historiques inutilisées : elles ne sont créées que si une ancienne brosse sans masque en a besoin. Les masques actifs sont préparés une seule fois, à 128 pixels sur mobile et 256 sur ordinateur, puis partagés. Le budget adaptatif de pixels est conservé.

## Musique locale

Le visiteur importe un MP3 (20 Mo maximum). Aucun fond audio n’est chargé automatiquement, aucun son n’est synthétisé. Le lecteur Web Audio existant conserve son analyse, sa capture et ses pauses. Une nouvelle importation remplace la musique, sans effacer l’œuvre. Les fichiers et leurs URL restent locaux ; l’ancien lecteur et son URL sont libérés au remplacement.

La pause manuelle est respectée en changeant de vue. La pause temporaire de cadrage reprend à la sortie du mode Photo, y compris pour un MP3 importé. La commande d’import reste disponible en FPV et gyro.

## Regard et photographie

La FPV accompagne le vol avec une distance modulée autour de 6 à 8 unités et un grand angle de 86 à 88°. Un léger décentrage garde l’oizo proche du centre tout en ouvrant le cadre devant son mouvement. Le bouton Vue globale 360° remplace les commandes de zoom. Cette vue cadre la sculpture entière et accepte la rotation horizontale et verticale sans suspendre la matière ni le son. Un second appui restaure le mode FPV ou gyro précédent. À l’entrée en gyro, le regard s’oriente vers le centre de la matière existante, avec son élévation, avant de laisser le visiteur explorer. Il ne suit pas ensuite automatiquement les déplacements des dépôts.

« Photographier la vue actuelle » utilise l’export PNG existant, jusqu’à 2560 pixels sur le grand côté. Il capture le regard courant sans changer de mode ni couper la musique ; aucune interface n’est incluse. Le mode de cadrage Photo et la vidéodio sont conservés.

## Contrôles et limites

Les tests ciblés couvrent le MP3 effectivement importé, son énergie mesurée, ses pauses/reprises, les six matières avec leurs masques, la réponse graphique à la musique, la dérive bornée et continue à 30/60 Hz simulés, la pause des forces, les réserves des textures, le PNG HD téléchargé depuis le gyro, la caméra et le budget mobile. Les références au coucher de soleil restantes sont des modules historiques et des tests unitaires isolés, sans effet sur le parcours actif.

Le champ est une simulation artistique légère, sans collisions entre fluides ni simulation physique de pigments. L’écoute et la cadence sur téléphone physique, les permissions des capteurs et tous les codecs vidéo restent à vérifier. Les tests de navigateur utilisent Chromium avec rendu WebGL logiciel.

## Éditeur et rig

Les images alpha sont décodées sur l’appareil, limitées à 8 Mo et réduites à 256 pixels sur mobile ou 512 sur ordinateur. Une image transparente conserve son alpha ; une image opaque devient un masque où les zones sombres déposent le pigment. Aucun téléversement. La texture d’origine peut être rétablie.

Les ailes conservent leur squelette à trois articulations pondérées. L’attitude utilise le cap et la pente du vol, amortis, avec une inclinaison latérale dans les virages. Les montées sollicitent les battements ; les plongées réduisent leur amplitude et replient les extrémités. La silhouette reste un petit V stylisé. Ce rig évoque une dynamique de vol et ne constitue pas une simulation aérodynamique.

## Validation de cette évolution

Validation précédente : 18 tests Chromium ciblés exécutés avec succès, ainsi que le build de production, Prettier et `git diff --check`. Ils couvrent notamment le centrage projeté de l’oizo pendant un vol mobile, le cadrage global et son retour vers FPV/gyro, l’ouverture tactile de l’éditeur, la conservation des réglages, l’import d’alpha réel, la libération des textures remplacées, les attitudes de montée/plongée et les deux sens de virage, puis les régressions audio, matières, capture et budget mobile. Les captures ont été inspectées. Ces contrôles ne remplacent pas une validation sur téléphone physique.

## Résonance locale, rubans souples et navigation orbitale

Le lecteur fournit désormais six bandes spectrales RMS, dans des tableaux réutilisés, en plus de l’énergie et des accents existants. L’analyse visuelle suit le rafraîchissement jusqu’à 60 Hz. Chaque dépôt possède une enveloppe locale (`createMaterialResponse`) : bandes primaire et secondaire choisies selon sa matière et sa graine, attaque, relâchement et mémoire d’accents distincts. Le signal global ne provoque donc plus une modulation identique sur tous les matériaux. Les pigments modulent moins leur opacité ; l’expression passe davantage par le mouvement.

Les vagues du vertex shader sont plus amples, lentes et spatialement continues. Les rotations, les dérives et une légère déformation anisotrope des dépôts utilisent leur enveloppe locale. Les transformations restent bornées et les pauses photo sont conservées. Les bornes de culling incluent une marge pour la déformation GPU.

Les rubans utilisent une interpolation de Hermite entre les positions déposées, avec subdivision bornée et une capacité préallouée. Les strates ne dessinent plus de zigzags à haute fréquence et les extrémités s’effacent selon un contour arrondi. Le masque des rubans est répété à une échelle adaptée, plutôt qu’étiré sur une capacité en grande partie vide : les premiers dépôts deviennent visibles plus tôt. Les tampons conservent leur masque complet.

Les buffers n’envoient au GPU que les nouvelles rangées de sommets. Les vecteurs de génération et les enveloppes sont réutilisés ; le test d’activité ne crée plus de tableau par dépôt et le pont de brosses évite de travailler en l’absence de voix. Le budget de pixels adaptatif et le plafond de traces mobile sont conservés. L’augmentation du maillage est réservée au lissage des matières, sans simulation physique de fluide ni génération de textures pendant le rendu.

`createOrbitalFlight` remplace, pour l’oizo actif, le décalage temporaire d’une courbe prédéfinie par un champ continu de vitesses autour du centre. Une force radiale maintient une enveloppe souple ; les gestes influencent directement la vitesse, amortie, et la circulation minimale évite un retournement brutal. L’altitude varie progressivement. Le moteur de vol historique de l’ancien atelier MP3 reste intact. Le rig de l’oizo conserve ses articulations et gagne de la cambrure et une réponse des épaules aux virages et plongées.

Les tests supplémentaires utilisent des signaux Web Audio réels grave/aigu, des réponses locales indépendantes, des simulations orbitales de 90 secondes à 30/60 Hz et une sculpture MP3 avec les six matières. La fluidité sur téléphone physique n’est pas déduite du rendu logiciel de Chromium.

Validation de la résonance orbitale : 21 tests distincts exécutés avec succès (suite de 20 contrôles puis les trois contrôles de résonance, incluant la nouvelle sculpture prolongée). Build de production, formatage et contrôle de diff réussis. Les captures de la sculpture MP3 en vue globale et gyro ont été inspectées ; aucune erreur JavaScript/WebGL relevée dans ce parcours. La qualité artistique reste à apprécier dans la pratique et aucune cadence sur téléphone physique n’est revendiquée.

## Dialogue du drone avec le vol

`createDroneChoreography` reçoit la direction et la vitesse réelles du vol. La courbure horizontale, la pente et la vitesse sont filtrées avant d’influencer le recul, le décalage latéral, la hauteur, l’anticipation du regard et une légère inclinaison du cadre. Les transitions utilisent des amortissements exponentiels indépendants de la cadence. La distance reste proche de l’oizo ; la taille de l’œuvre et le volume sonore ne déclenchent aucun recul automatique.

Le module réutilise ses vecteurs et son état, sans allocation par image. Le cadrage se décale légèrement et reste dirigé près de l’oizo, tandis que la position de caméra possède sa propre inertie. Le retour depuis les vues globale, photo et gyro réinitialise la mesure du changement de cap pour éviter une fausse impulsion. Les fonctions des autres vues sont conservées.

## Sillage depuis la queue

Le point de dépôt utilise la transformation du rig réel de l’oizo : son origine est au centre de la queue, avec la rotation du corps et l’échelle de la silhouette. L’oiseau est mis à jour avant les dépôts. Chaque sommet mémorise son centre de trajectoire et son instant de naissance ; le shader ouvre progressivement sa largeur sur environ 3,8 secondes. La déformation musicale et la dispersion augmentent avec cette ouverture, pour garder le fil attaché à la queue à la naissance. Les horloges restent figées en mode Photo.

Les tampons et éclaboussures conservent leurs matières et leur dispersion, mais celle-ci apparaît progressivement. Un fin filament commun relie leurs dépôts. Les anciennes brosses de l’atelier historique conservent leur largeur immédiate lorsqu’elles ne reçoivent pas de naissance de sillage. Les attributs et le fil utilisent les buffers et la libération des ressources existants, sans génération de texture pendant l’animation.
