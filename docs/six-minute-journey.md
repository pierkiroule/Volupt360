# OIZO •° — Six minutes pour peindre le ciel

## Intégration

Le parcours réutilise `ChillExperience`, `createSoundNest`, les six profils de `chillConfig`, les géométries et shaders des brosses, `createPointFlight`, le rig de `createOizo`, `createTwigBank`, `createVocalBubbles` et `createCameraRig`. Aucune dépendance ajoutée, aucun backend. Les entrées historiques restent accessibles ; le moteur de peinture n’est pas remplacé.

`experienceTimeline` est l’unique horloge : 360 secondes actives puis huit secondes de départ. `createChillSession` réexporte ce contrôleur pour compatibilité. Le temps musical monotone pilote la traversée lorsqu’un audio est disponible ; sans fichier, le temps actif prend le relais. Pause, onglet masqué et interruption du contexte audio suspendent le parcours. La reprise attend le réveil audio avant de relancer l’horloge.

## Un monde continu

- Nuit, 0–60 s : indigo, bleu de Prusse, gris de Payne et réserves étoilées.
- Aurores, 60–180 s : voiles aquarellés sauge, turquoise et mauve. La direction des dépôts influence subtilement leur présence.
- Aube, 180–360 s : rose poudré, pêche, papier clair et céladon ; ouverture lente de la caméra.

Les mélanges commencent autour des frontières temporelles : aucune bascule de scène à 60 ou 180 secondes. `phasePalette` personnalise progressivement les nouveaux dépôts sans recolorer les anciens. Le skydome conserve un unique shader et une texture alpha aquarelle ; il suit la caméra pour rester enveloppant. Aucun océan, bloom ou faisceau lumineux.

## Mémoire picturale

Les huit marques récentes gardent leurs comportements humides et leur réponse musicale. Ensuite, `createPigmentArchive` conserve les géométries originales dans des buffers regroupés par matière : couleurs, UV, texture alpha, graine et extrémités du tracé restent présents. Ce ne sont pas des lignes de substitution. Le pigment sec n’est plus effacé avec l’âge ; les particules temporaires utilisent toujours leurs buffers bornés.

Les couleurs sont stockées sur 8 bits, les normales sur 16 bits et l’opacité regroupée par quarts pour réduire mémoire et appels de rendu. Les textures restent partagées ; destruction des archives et destruction des masques sont séparées. La croissance dépend de la peinture déposée, pas du nombre de frames. Quitter remet les ressources de séance à zéro.

Un test synthétique de 10 944 points répartis entre les six brosses produit neuf lots et environ 26,5 Mio de tableaux de géométrie. Le GPU conserve aussi ses buffers : ce chiffre n’est ni la RAM totale de l’application, ni une garantie de fluidité sur tous les téléphones.

## Vol, bulles et regards

Le toucher peint immédiatement depuis la queue, le glissement pilote le vol et le relâchement rapproche l’oiseau de la bulle disponible la plus proche. La vitesse converge progressivement et les virages sont bornés. Les ailes articulées existantes sont conservées.

Les 24 haïkus originaux en trois vers sont répartis sur toute la traversée : quatre bulles nocturnes, huit pendant les aurores, douze à l’aube. Les apparitions sont progressives. Une rencontre présente le texte pendant cinq secondes et fait éclater puis disparaître la bulle. Aucun score, aucun objectif de collecte.

Deux regards sont proposés : suivi FPV et contemplation gyro. En gyro, glisser oriente le regard sans tourner la sculpture ni piloter l’oiseau. L’autorisation native est demandée si nécessaire ; un refus conserve le contrôle tactile et le recentrage.

## Musique disponible et limite

Le parcours sélectionne en priorité `public/ambiances/gravity.mp3` dès que ce fichier est présent au build (nom reconnu sans distinction de casse). Ce fichier n’était pas encore disponible lors de la vérification. En attendant, il conserve la première ambiance du catalogue.

Le seul fichier d’ambiance fourni, `public/ambiances/ambiance01.mp3`, dure environ 222 secondes. Il boucle pour couvrir la séance ; un filtrage doux évolue avec les phases et le gain s’atténue pendant le départ final. Il ne s’agit pas d’une nouvelle composition ni d’un mixage de stems. Une véritable bande-son de six minutes reste à fournir. Aucun sample ou fichier musical n’est fabriqué.

Le lecteur existant fournit analyse spectrale et énergie aux matières. Un fichier de durée suffisante peut être utilisé sans bouclage ; un chargement absent ou échoué laisse fonctionner le parcours silencieusement.

## Final et PNG

À 360 secondes, la peinture cesse et l’oiseau s’éloigne doucement. Après huit secondes, la scène se fige et la caméra rejoint progressivement la vue globale. La proposition de photo attend encore son installation. L’export ne capture que le canvas Three.js, sans interface : 1 920 px sur le grand côté mobile, 3 200 px sur ordinateur, dans les limites du GPU. Ces plafonds limitent le pic mémoire ; une résolution illimitée n’est pas promise.

## Vérifications et limites

Les suites ciblées couvrent horloge et transitions, pause/reprise audio réelle, interruption AudioContext, absence de MP3, refus gyro et alternative tactile, pilotage, six brosses, réponse des pigments, alphas, persistance des premiers et derniers dépôts, bulles 4/12/24 disponibles, final et PNG mobile décodé. Des captures GPU vérifient les différences nuit/aurores/aube et l’influence du geste sur les voiles.

La traversée visuelle complète est exécutée en accéléré dans une même scène ; le test de charge simule six minutes de dépôts. Cela ne remplace pas une séance réelle de six minutes sur téléphone physique. Les interruptions système et les autorisations gyro doivent aussi être confirmées sur Safari iOS et Chrome Android réels. Aucune mesure ni modification de l’état psychologique n’est revendiquée.
