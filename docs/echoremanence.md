# ÉCHORÉMANENCE•° — le ciel se souvient

## Audit et intégration

La scène réelle est créée par `src/engine/createSoundNest.js` : Three.js, groupe `landscape`, caméra et post-traitement existants. Aucun skydome n’était présent ; le fond était une couleur papier unie. Le catalogue possède 18 brosses : les 12 initiales et six ajouts de particules. Rubans/shaders, nuages, réseaux, sphères et particules conservent leurs fonctions de rendu.

L’oizo et son vol sont pilotés par `SonoizoDance`, `createPainterFlight`, `BrushBridge` et `createOizo`. `TraceMemory` et `TraceEncounter` maintiennent la géométrie simplifiée et détectent les rencontres 3D. Les appels sonores passent par le pad source et `createTwigBank` ; les vocaux sont optionnels dans la configuration actuelle. Le nouveau module ne modifie ni les trajectoires ni leurs déclenchements.

Points d’intégration : après `stroke.append(pose)`, chaque dépôt fournit son identifiant, sa couleur, sa brosse et sa position à `onTraceCreated`. La rencontre existante appelle `onTraceEncounter` avant ses appels audio inchangés. `destroyStroke` appelle `onTraceExpired`. Le reset et la destruction vident la mémoire céleste. Le module reste indépendant du réglage de la mémoire de collisions et du son.

## Technique

`EchoChamber` utilise une sphère intérieure de rayon 420 et une seule texture RGBA Canvas 2D. Une mémoire bornée conserve six points représentatifs par trace, en coordonnées sphériques et 3D, les identités, couleurs, dates, résonance et dissipation. Ce n’est pas une copie des maillages de brosses. La projection suit la convention UV de SphereGeometry. Les empreintes sont répétées aux deux bords longitudinaux et les rayons sont corrigés près des pôles.

Chaque empreinte diffuse en trois couches retardées, vers 2,5 / 13 / 39 secondes avec variations déterministes par trace. Elles grandissent, se décalent et s’amortissent à des vitesses différentes. Des gradients doux constituent les lavis, le shader applique trois lectures filtrées et une déformation périodique continue à la couture. Pas de ray marching, de capture de la sculpture, de ping-pong ou de nouvelle bibliothèque. Le ciel est transparent et vide sans dépôts ; la sphère n’est pas dessinée tant qu’aucun pigment n’est présent.

La réminiscence monte sur plusieurs secondes, puis décroît sur des dizaines de secondes. La dissipation interpole également la réactivation, pour éviter une reprise instantanée d’opacité. Une empreinte peut survivre à la suppression de son tracé, mais une entrée évincée par la limite de capacité ne peut plus être rappelée. Les grands vides restent dominants : seuls quelques points deviennent des pigments diffus ; l’opacité est pondérée par la quantité d’empreintes et plafonnée dans le shader.

## Temps et réglages

Valeurs par défaut : activé, présence 0,24 et mémoire 240 secondes. Présence et Mémoire sont accessibles dans un petit volet replié « ÉCHORÉMANENCE•° ». Le bouton permet une désactivation totale des événements, du calcul et du rendu ; les ressources fixes sont conservées pour permettre une réactivation immédiate. La désactivation fige la mémoire plutôt que de la vider. Les réglages survivent au changement d’univers ; le contenu de la mémoire est réinitialisé avec la sculpture.

La chambre continue à se dissiper quand l’utilisateur cesse de peindre, sans dépendre du son. Les mouvements sont très lents et ne prescrivent pas un rythme respiratoire. Le temps avance avec `dt`, pas avec le nombre d’images. Le mode photo fige la mémoire, son shader et sa texture, y compris lors du cadrage et de l’export PNG. Les seules déformations apparaissent là où les gestes ont laissé un pigment.

## Ressources et limites

Mobile : 512 × 256, 32 empreintes, quatre actualisations au maximum par seconde. Ordinateur : 1024 × 512, 64 empreintes, environ six actualisations par seconde. Le rendu de la sphère reste un seul draw call et trois lectures de texture par fragment. Des images lentes soutenues déclenchent une réduction à 512 × 256 ; la mesure inclut les autres coûts de la scène. La résolution ne remonte pas automatiquement. Le support Canvas est redessiné à cadence limitée et les empreintes périmées sont retirées ; la mémoire ne grandit pas indéfiniment.

Le redimensionnement de la fenêtre ne recrée pas de texture : la projection sphérique reste indépendante de l’aspect. La perte de contexte suspend le module ; la restauration signale une nouvelle mise à jour de texture. Le message de perte de contexte et la politique de reprise de l’application restent ceux de l’existant. Une restauration réelle sur appareils physiques n’a pas été testée.

La destruction libère texture, matériau, géométrie et références, puis retire la sphère du graphe. Les canvas et ports audio des moteurs existants restent sous leur propre gestion.

Les essais utilisent Chromium/WebGL réel avec rendu logiciel dans cet environnement. Ils vérifient notamment des pixels avant/après dépôt et réminiscence, les ressources GPU, la couture, les capacités, la dissipation, les réglages et le parcours des 18 brosses. Une audition et une mesure de fluidité sur téléphone physique restent nécessaires ; aucune garantie de FPS matériel n’est déduite du navigateur de test.

Validation exécutée : 19 tests de régression passent (chambre, ambient, mémoire/rencontres, particules, navigation tactile et audioréactivité). Les trois tests de la chambre et le test du lecteur vocal à 24 fragments ont ensuite passé après l’optimisation du ciel vide, soit 20 scénarios distincts vérifiés. Le build Vite, le contrôle Prettier et `git diff --check` passent. Aucun essai de FPS sur téléphone physique ni de restauration réelle du contexte n’a été effectué.
