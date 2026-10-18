> Document historique du parcours de cinq minutes. Pour le parcours actuel, voir [la traversée de six minutes](six-minute-journey.md).

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

## Matière résonante, contraste et continuité

Les six profils utilisent maintenant des pigments plus chromatiques et des encres plus denses. Le réglage fixe de rendu passe à contraste 1,16 et saturation 1,20 ; les textures sont générées hors boucle de rendu en 256 px sur mobile et 512 px sur ordinateur. Les réserves du papier restent claires.

`materialMode` active la nouvelle matière uniquement pour les profils chill. Les rubans sont interpolés à un pas plus fin (0,2 unité, au maximum quatre sous-échantillons par dépôt), et le sillage se déploie en 1,7 seconde au lieu de 3,8. Le fil continu des tampons et éclaboussures reçoit le même mode.

Chaque dépôt conserve une humidité bornée dans son enveloppe spectrale. Les basses et transitoires favorisent la diffusion ; le temps et les hautes fréquences favorisent la sédimentation. Le shader combine cet état, l’âge interpolé des points déposés, les UV et une phase propre au dépôt pour déplacer les lisières, enrichir les auréoles et faire varier le grain. Ce sont des correspondances artistiques, pas une simulation physique de fluide.

Le mode chill n’applique plus les rotations, étirements et déplacements de bloc de `createPictorialFlow`. La concentration générale en pigment reste fixe ; la musique agit dans des zones différentes de la texture et dans de petites vibrations locales des bords. Les chemins historiques conservent le comportement antérieur.

Validation dédiée : différences de pixels WebGL entre matière calme/résonante et humide/sèche pour les six brosses, sans transformation rigide du groupe ; enveloppes spectrales distinctes et humidité bornée qui diminue dans le silence. Les performances sur téléphone réel et l’écoute artistique restent à vérifier.

## Planches alpha et carnet manuscrit

`createWatercolorAlpha` génère en Canvas 2D des planches RGBA reproductibles : sept dépôts irréguliers, contours diffus, auréoles de séchage, remontées de pigment et grain du papier. Les variantes wash/dry/fiber/splatter/stamp gardent leurs singularités. Un fond connecté évite les coupures du masque sur les rubans. Le générateur est appelé au chargement des matières, jamais dans la boucle de vol. La texture de brosse existante réutilise cette couche alpha, avec ses couleurs de pigment.

La même famille de planches sert au masque décoratif de l’accueil et à deux projections continues sur le skydome (une seule texture GPU 256 px supplémentaire, libérée à la destruction). Le ciel reste non figuratif. Les textures de brosse utilisent le cycle de vie déjà en place ; le masque de l’accueil est une image locale générée en mémoire.

La police manuscrite **Caveat** est hébergée localement, en WOFF sous-ensemble latin avec accents français (environ 96 Ko). Source : dépôt Google Fonts, `ofl/caveat/Caveat[wght].ttf`. Licence SIL OFL 1.1 conservée dans `public/fonts/OFL-Caveat.txt`. Aucun chargement de police chez un tiers au runtime. Titres, haïkus et fin de voyage adoptent ce trait manuscrit ; les commandes gardent une typographie sobre et lisible. L’accueil présente deux grandes empreintes translucides et une hiérarchie de carnet papier.

Les tests dédiés vérifient la reproductibilité, la variété des alphas, les réserves et le raccord des rubans, ainsi que le chargement de la police locale, le masque de l’accueil et l’absence de débordement mobile. L’appréciation artistique et la fluidité sur téléphone physique restent à valider.

Validation de cette intégration : 10 tests ciblés réussis (alphas, police et accueil mobile, six matières résonantes, haïkus et parcours), build Vite et format réussis. Accueil mobile inspecté visuellement dans Chromium.
