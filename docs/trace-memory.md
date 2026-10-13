# Mémoire des traces — étapes 1 et 2

## Audit et périmètre

Le dépôt actuel possède 18 brosses : les 12 d’origine et les 6 particules ajoutées récemment, réparties entre trois univers. Toutes sont conservées. `createSoundNest` orchestre les dépôts via `addSample` et `BrushBridge`, conserve au maximum 80 marques et détruit leurs géométries, matériaux et leases de textures. `SonoizoDance` et `createPainterFlight` restent responsables du vol ; `createOizo` reste responsable du V et de son animation. `createTwigBank` conserve les 24 MP3, les ambiances, les analyseurs, la réservation vocale exclusive et le fondu d’entrée de 6 ms. La caméra, le guidage tactile et l’appui long ne changent pas. Les exports restent gérés par le renderer et `createVideodio`.

Cette livraison implémente uniquement la mémoire et la détection. Elle ne déclenche aucune voix ni condensation depuis les traces. Le réseau initial et ses collisions sont désactivés mais leur code est conservé. Le décor d’ouverture précalculé est également désactivé afin de démarrer sans traces préfabriquées. Les pads et l’appui long continuent à décider des dépôts : aucune peinture automatique n’est ajoutée.

## Mémoire indépendante du rendu

`TraceMemory` reçoit une copie des positions réellement déposées après chaque appel au moteur de brosse. Une trace correspond à une marque graphique, avec son identifiant, sa brosse, son temps de création et un historique de résonance. Chaque segment conserve le temps du point le plus récent, son identifiant et sa dernière rencontre. Le repère est celui du paysage : rotation et déplacement du paysage transforment le tracé et l’oizo ensemble, sans modifier les distances réelles.

Le pas minimal est de 0,25 unité. Les copies répétées d’un même point sont ignorées. Une discontinuité de plus de 12 unités commence une nouvelle portion, sans segment imaginaire. La mémoire est bornée à 80 traces et 80 points par trace. Le retrait d’une marque effacée ou évincée retire aussi ses segments et leurs cellules ; changer d’univers ou détruire la scène nettoie la mémoire. Aucun accès aux pixels ou aux particules n’est nécessaire.

## Rencontre en 3D

`TraceEncounter` mesure la distance exacte entre le déplacement fini de l’oizo et les segments anciens, en traitant aussi les cas parallèles et les déplacements nuls. Un hash spatial à cellules de 4 unités limite les candidats à ceux proches de la boîte du mouvement. La requête est élargie du rayon de rencontre, et les doublons sont filtrés.

Paramètres dans `traceConfig.js` : distance 1,6 unité, âge minimal 6 secondes, intervalle global 9 secondes et protection de 30 secondes sur un même segment. Un saut de plus de 12 unités est ignoré pour éviter une collision fictive. Le temps de simulation est suspendu en vue photo. Une rencontre produit des données et enrichit l’historique, sans infléchir ni téléporter l’oizo.

## Visualisation temporaire et retour arrière

Ouvrir `/?traceDebug=1` pour afficher les segments de référence en bleu et un petit repère de rencontre pendant 1,5 seconde. Le rendu artistique reste celui des brosses. L’affichage de débogage utilise un buffer fixe et un marqueur, libérés avec la scène. Il est absent par défaut. Ne pas exporter une œuvre avec ce paramètre si les repères ne doivent pas apparaître dans l’image.

Construire avec `VITE_ENABLE_TRACE_MEMORY=false` puis redéployer restaure le réseau vocal préfabriqué et le décor initial. Le code du réseau n’est pas supprimé. Aucun changement de nom ou de menu n’est inclus dans cette migration.

## Vérification et étapes suivantes

Les tests ciblés couvrent le départ vide, les véritables dépôts de brosse, le nettoyage au changement d’univers, l’âge minimal, une intersection projetée sans contact réel en profondeur, les distances entre segments finis, les temporisations, les sauts rejetés et les limites de mémoire/index. Une simulation de quatre minutes maximum du vol existant enregistre ses passages et vérifie une première rencontre sans attraction ni déplacement forcé. Les contrôles de régression portent sur la musique, les particules WebGL, la navigation, l’appui long tactile en émulation mobile et le PNG HD.

`EchoResonance`, la condensation plastique et la connexion vocale sont réservés au lot suivant. La future correspondance des 12 brosses initiales aux 24 fragments devra être une configuration séparée ; les six brosses supplémentaires resteront disponibles. Téléphone physique et export vidéo non retestés pour cette migration. Aucune fusion automatique.
