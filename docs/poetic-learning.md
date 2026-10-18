# OIZO•° — Poetic Learning

## Parcours

Le parcours principal est désormais « Pourquoi cherchons-nous à nous sentir plus légers ? ». Douze destinations sont réparties dans le même ciel 3D. Une fixation continue de 1,5 seconde ouvre une destination, puis chacune des trois petites bulles pédagogiques, dans l’ordre Mystère → Découverte scientifique → Résonance.

Le déplacement est lent (0,7 unité/seconde), orienté par le regard. Une limite douce réduit la dérive vers l’extérieur. Dans une destination, la caméra reste à une position fixe : seuls le regard tactile et le gyroscope tournent la vue. L’entrée conserve le point de vue et fait apparaître progressivement les matières locales, sans téléportation. « Revenir au ciel » reste disponible, même avant d’avoir lu les trois messages.

Les quinze minutes sont indicatives : une escale est ensuite proposée, sans couper le voyage ni obliger à finir. Une interruption met en pause ; la reprise exige un geste explicite. Aucun compte à rebours ni score. L’indication 0/12 compte les destinations dont les trois messages ont été ouverts.

## Architecture réutilisée

- createSoundNest conserve renderer, effets, qualité adaptative, redimensionnement, contexte WebGL et export PNG HD.
- createCameraRig conserve les écouteurs tactiles et gyroscope, la permission native et le fallback. Deux méthodes ajoutent un point de vue mobile et son recentrage.
- createChillSky conserve l’atmosphère aquarellée, étirée sur quinze minutes.
- Les douze brosses utilisent les moteurs createBrushStroke existants, leurs textures et shaders. Aucun remplacement par des lignes génériques.
- Le petit OIZO utilise le rig existant. Il accompagne le regard, sans pilotage tactile de dessin.
- useTwigBank et Web Audio réutilisent Gravity et son analyse. Lecture stéréo sans filtre tonal : seul le volume et les fondus affectent le MP3. Aucun son synthétique, sample ajouté ou API externe.

createPoeticLearning coordonne EXPLORE/BUBBLE, regard, progression et ressources. createGazeInteraction isole la fixation. createLearningIllustration utilise un champ de points/lignes et des lavis partagés, avec douze lois de mouvement sensibles au regard. Ces animations illustrent un principe ; elles ne reproduisent pas un protocole expérimental et ne mesurent pas le visiteur.

PoeticLearningExperience gère interface, messages, références, pause, son et sauvegarde. Le menu des brosses disparaît du nouveau parcours. L’ancien OIZO-BULLE reste accessible avec ?original=1 ; ?legacy=1 et ?classic=1 restent inchangés.

## Matières automatiques

Une destination entièrement découverte active sa brosse au retour dans le ciel. Mouvement et orientation tracent spontanément ; aucun geste de dessin. Une reprise active une matière déjà découverte.

Douze identités : lavis, grain minéral, dilution, filaments libres, calligraphie, échos, voiles, bulles, corolles, hachures, réseau et éclats. La musique module les pigments via les uniforms existants.

Budget : douze tronçons maximum, 96 dépôts maximum par tronçon selon le moteur, 10 échantillons/seconde sur ordinateur, 6 sur mobile, textures alpha 128 pixels à la demande (douze maximum). Les tronçons sont fermés régulièrement, puis détruits après dissipation ; durée maximale 44 secondes. Les traces sont volontairement temporaires dans ce parcours.

Le PNG HD réutilise la caméra courante, sans interface : 1920 pixels sur mobile, 3200 sur ordinateur. Il est proposé lors d’une escale ou après les douze découvertes.

## Contenus et références

learningContent.js centralise les douze sujets, leurs trois messages, nuance scientifique, citation, DOI, consigne sensorielle et paramètres visuels.

Chaque Découverte distingue observations et limites ; chaque Résonance porte l’étiquette « Interprétation poétique ». Les hypothèses sur les rêves, les mécanismes hypnotiques et les processus ironiques ne sont pas des certitudes. Aucune sensation n’est assimilée à un diagnostic ou une amélioration clinique. Les animations n’imposent ni respiration, ni mouvement corporel, ni perte de contrôle.

Les références sont proposées pour révision éditoriale professionnelle. La vérification sur Crossref a été tentée mais bloquée par HTTP 403, y compris hors sandbox : aucune vérification en ligne des articles n’est revendiquée. Une relecture scientifique spécialisée reste recommandée avant diffusion pédagogique publique.

## Sauvegarde et données

Clé locale oizo.poetic-learning.v1 : version, identifiants des messages ouverts, destinations découvertes et durée active. Validation des identifiants, de l’ordre et des bornes. Le parcours fonctionne si localStorage est refusé ou saturé, avec indication de non-sauvegarde.

Aucun compte, backend, inférence émotionnelle, mesure psychologique ou envoi de progression. Les traces et la position exacte ne sont pas sauvegardées : la reprise reconstitue un ciel neuf avec les découvertes et une brosse disponible. « Recommencer un ciel » réinitialise explicitement la progression.

## Vérifications et limites

Tests du nouveau parcours : contenus structurés, fixation interrompue, données locales invalides, refus de stockage, tactile mobile, trois messages, vue fixe, reprise, douze déblocages, durée accélérée de quinze minutes, budgets, capteurs simulés acceptés/refusés et douze moteurs de brosses rendus en WebGL.

Les scénarios de l’ancien parcours conservent leurs assertions et ciblent sa route ?original=1. Le build Vite et le formatage restent requis.

L’émulation Chromium et les capteurs simulés ne remplacent pas un essai Android/iOS physique. Aucune mesure de fluidité soutenue ni du tas JavaScript sur téléphone physique. Le temps accéléré valide les états et budgets, pas quinze minutes d’écoute humaine. Harmonie visuelle et lisibilité restent à évaluer avec le public cible.

### Résultats exécutés

- Nouveau parcours : 9 tests Playwright réussis (Chromium, 21,6 secondes).
- Non-régression : 39 tests réussis dans la sélection de 47 tests (39 historiques + 8 premiers nouveaux), puis les 9 nouveaux rejoués après l’ajustement du contraste sur fond clair.
- PNG mobile réellement téléchargé et vérifié : côté long de 1920 pixels, y compris avec Gravity bloqué.
- Les 12 brosses ont été rendues et leurs compteurs de textures/géométries GPU sont revenus à zéro après destruction.
- Build Vite, formatage des fichiers modifiés et contrôle des différences réussis.

Le correctif de fidélité MP3 supprime le filtre passe-bas de la chaîne commune : source média → analyseur transparent → gain → sortie. Onze tests ciblés ont été exécutés avec succès, dont deux vérifications du graphe audio et les neuf tests du parcours ; build Vite réussi.
