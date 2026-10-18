# L’Oizo chill

## Parcours

Une entrée unique, sans choix d’univers ou d’emojis. Le moteur Three.js, le rig des ailes, le contrôleur de vol, les brosses, les bulles, le lecteur Web Audio et le PNG sont réutilisés.

- **Brume** : lavis ample et nuages de points doux.
- **Soie** : matière sèche légère et particules étirées.
- **Fil de lumière** : ligne fine et petits filaments.
- **Poussière d’or** : éclaboussures et semis diffus.
- **Marée** : dilution et dérive souple.
- **Constellation** : tampons et petits halos.

Le contact dépose immédiatement depuis la queue ; le glissement pilote le point de visée invisible. Sans contact, le vol vise la bulle disponible la plus proche. Un recul lent de la caméra, indépendant de l’intensité sonore, ouvre parfois le paysage ; les courbes du vol influencent légèrement cette distance, amortie. Seuls FPV et gyro sont proposés durant la séance. Pas d’outil capture, de générateur ou d’éditeur à ce stade.

Les 24 textes sont dans `chillConfig.js`. Les citations nommées proviennent des fables de La Fontaine ; les autres sont identifiées comme proverbes ou expressions, sans attribution inventée. L’affichage conserve les cinq secondes et les silences du moteur de bulles. Aucune voix n’est chargée.

## Cinq minutes et sortie

`createChillSession` compte 300 secondes de temps actif. Pause manuelle et onglet masqué suspendent l’évolution. Le shader du skydome passe d’un horizon chaud à un ciel nocturne, avec disque solaire descendant, mer stylisée, reflet et premières étoiles. Aucun fichier d’image ou appel réseau pour le ciel.

À 300 secondes, les dépôts cessent. Pendant huit secondes supplémentaires, l’oizo garde un cap vers l’horizon et la caméra le laisse s’éloigner. La musique s’atténue. À 308 secondes, le moteur masque les bulles restantes, présente l’œuvre en vue globale et la fige ; la musique est mise en pause. Le bouton final prépare une photo PNG HD, puis propose son téléchargement. Cette vue finale ne constitue pas un troisième bouton de navigation pendant le voyage.

Les pigments sont conservés plus longtemps pendant la séance, avec les limites de nombre de marques existantes. Les premiers gestes restent donc plus présents, sans croissance mémoire infinie. Les particules se dissipent progressivement et leur tampon circulaire réutilise les mêmes entrées.

## Architecture et ressources

- `ChillExperience` : interface, démarrage sonore autorisé par le toucher, pause et photo finale.
- `chillConfig` : six profils et 24 fragments sourcés.
- `createChillSession` : horloge et phases, indépendante du rendu.
- `createChillSky` : une sphère et un shader, soleil/mer/étoiles procéduraux.
- `createChillTrails` : un seul Points, 640 particules sur mobile ou 1280 sur ordinateur, tableaux préalloués et réutilisés. Formes, dispersion et longévité varient selon la brosse ; énergie et transitoires musicaux modulent leur mouvement et leur présence.
- Intégration limitée dans `createSoundNest` et `createCameraRig`. Le budget de rendu adaptatif existant reste actif.

Pas de nouvel appel à une API ni de dépendance. Pas de recorder vidéo ou de capture audio instancié dans le mode chill. Géométries, matériaux, timers et URL de photo libérés au démontage. Le skydome reste dans le repère du monde, séparé des rotations de la sculpture.

L’ancien App reste à `/?legacy=1` et `/?classic=1`, pour réversibilité. Les anciens tests d’interface ÉchoMood visent cette ancienne entrée ; ils ne constituent pas des tests de la nouvelle entrée chill.

## Validation et limites

10 tests ciblés réussis : horloge exacte (300 + 8 secondes), six brosses, deux vues, analyse du MP3, premier dépôt, pause réelle, gyro, fin et PNG avec horloge accélérée, réponse des particules à l’énergie vérifiée par pixels WebGL, budget de particules fixe après 5 000 émissions, pilotage et exclusions des bulles consommées. Build Vite, Prettier et git diff réussis.

Le test de fin accélère uniquement l’horloge ; aucune séance de cinq minutes sur appareil physique n’a été observée. Images de début et de fin de voyage inspectées sous Chromium logiciel. Écoute artistique, fluidité sur téléphone réel et lisibilité de nuit à évaluer. Le ciel est une évocation procédurale, pas une simulation physique d’océan. Une seule composition MP3 est disponible dans le dépôt.

L’application propose une pause artistique et un support d’attention. Aucun bénéfice clinique sur la régulation émotionnelle, ni aucune efficacité contre l’impulsivité, n’est établi par ces tests techniques.
