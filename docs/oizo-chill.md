# L’Oizo de l’Haïkuarelle Virtuelle

## Parcours

Une entrée unique, sans choix d’univers ou d’emojis. Le moteur Three.js, le rig des ailes, le contrôleur de vol, les brosses, les bulles, le lecteur Web Audio et le PNG sont réutilisés.

- **Lavis aérien** : voiles dilués et réserves de papier.
- **Pigment sec** : grain irrégulier et texture mate.
- **Encre fine** : filament sombre, mince et fluide.
- **Éclats d’encre** : petites taches et dispersion légère.
- **Encre diluée** : matière translucide et diffusion souple.
- **Empreintes** : tampons granuleux et dépôts délicats.

Le contact dépose immédiatement depuis la queue ; le glissement pilote le point de visée invisible. Sans contact, le vol vise la bulle disponible la plus proche. Un recul lent de la caméra, indépendant de l’intensité sonore, ouvre parfois le paysage ; les courbes du vol influencent légèrement cette distance, amortie. Seuls FPV et gyro sont proposés durant la séance. Pas d’outil capture, de générateur ou d’éditeur à ce stade.

Les 24 bulles révèlent des haïkus originaux, chacun en trois vers, dans `chillConfig.js`. Les images de saison, le blanc, l’eau, l’encre et le passage de l’oiseau remplacent les proverbes et les conseils. Il s’agit d’une écriture libre inspirée du haïku, sans revendication de métrique 5–7–5. Aucune attribution à un auteur existant. Les sauts de ligne sont préservés ; apparition et disparition restent incluses dans les cinq secondes. Aucune voix n’est chargée.

## Cinq minutes et sortie

`createChillSession` compte 300 secondes de temps actif. Pause manuelle et onglet masqué suspendent l’évolution. Le shader du skydome fait évoluer très lentement des lavis bleu-gris, vieux rose et mauve sur un papier ivoire. Bruit 3D continu, lisières diffuses, granulation fine et grandes réserves : aucune mer, ligne d’horizon, étoile ou disque solaire. Aucun fichier d’image ou appel réseau pour le ciel.

À 300 secondes, les dépôts cessent. Pendant huit secondes supplémentaires, l’oizo garde un cap vers l’horizon et la caméra le laisse s’éloigner. La musique s’atténue. À 308 secondes, le moteur masque les bulles restantes, présente l’œuvre en vue globale et la fige ; la musique est mise en pause. Le bouton final prépare une photo PNG HD, puis propose son téléchargement. Cette vue finale ne constitue pas un troisième bouton de navigation pendant le voyage.

Les pigments sont conservés plus longtemps pendant la séance, avec les limites de nombre de marques existantes. Les premiers gestes restent donc plus présents, sans croissance mémoire infinie. Les particules se dissipent progressivement et leur tampon circulaire réutilise les mêmes entrées.

## Architecture et ressources

- `ChillExperience` : interface, démarrage sonore autorisé par le toucher, pause et photo finale.
- `chillConfig` : six profils et 24 fragments sourcés.
- `createChillSession` : horloge et phases, indépendante du rendu.
- `createChillSky` : une sphère et un shader de papier et lavis procéduraux.
- `createChillTrails` : un seul Points, 640 particules sur mobile ou 1280 sur ordinateur, tableaux préalloués et réutilisés. Formes, dispersion et longévité varient selon la brosse ; énergie et transitoires musicaux modulent leur mouvement et leur présence.
- Intégration limitée dans `createSoundNest` et `createCameraRig`. Le budget de rendu adaptatif existant reste actif.

Pas de nouvel appel à une API ni de dépendance. Pas de recorder vidéo ou de capture audio instancié dans le mode chill. Géométries, matériaux, timers et URL de photo libérés au démontage. Le skydome reste dans le repère du monde, séparé des rotations de la sculpture.

L’ancien App reste à `/?legacy=1` et `/?classic=1`, pour réversibilité. Les anciens tests d’interface ÉchoMood visent cette ancienne entrée ; ils ne constituent pas des tests de la nouvelle entrée chill.

## Validation et limites

10 tests ciblés réussis : horloge exacte (300 + 8 secondes), six brosses, deux vues, analyse du MP3, premier dépôt, pause réelle, gyro, fin et PNG avec horloge accélérée, réponse des particules à l’énergie vérifiée par pixels WebGL, budget de particules fixe après 5 000 émissions, pilotage et exclusions des bulles consommées. Build Vite, Prettier et git diff réussis.

Le test de fin accélère uniquement l’horloge ; aucune séance de cinq minutes sur appareil physique n’a été observée. Images de début et de fin de voyage inspectées sous Chromium logiciel. Écoute artistique, fluidité sur téléphone réel et lisibilité sur papier à évaluer. Le rendu est une évocation procédurale de papier et de pigments, pas une simulation physique de fluides. Une seule composition MP3 est disponible dans le dépôt.

L’application propose une pause artistique et un support d’attention. Aucun bénéfice clinique sur la régulation émotionnelle, ni aucune efficacité contre l’impulsivité, n’est établi par ces tests techniques.

## Direction aquarelle et encre

Les particules sont plus petites, mates et granuleuses, sans anneaux brillants. Leurs couleurs reprennent les pigments des six brosses ; deux brosses utilisent des encres sombres pour garder la finesse du contraste. Les bulles chill utilisent une membrane de lavis irrégulier plutôt qu’un reflet de verre. Les éléments d’interface reprennent des encres gris-bleu sur fond papier. Le vol, la musique, les textes et la durée restent inchangés.

Validation de cette direction visuelle : 8 tests ciblés réussis (parcours chill, particules WebGL et bulles), build Vite et format réussis. Vue mobile inspectée dans Chromium ; fluidité et perception des textures sur téléphone physique non vérifiées.

## Haïkuarelle Virtuelle

Le titre devient « L’Oizo de l’Haïkuarelle Virtuelle ». Le compteur affiche « Haïkus révélés » et le PNG souvenir reprend ce nom. Validation : 6 tests ciblés réussis, dont unicité des 24 haïkus, trois vers par texte, conservation des sauts de ligne et affichage central de cinq secondes ; parcours, particules et PNG restent couverts. Build et format réussis.
