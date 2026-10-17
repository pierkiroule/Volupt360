# Fragments existentiels ÉchoMood

Les bulles révèlent désormais du texte, sans lecture vocale. Les MP3 historiques restent sur disque pour un éventuel retour ; ils ne sont plus chargés au démarrage. La musique d’ambiance reste indépendante.

`src/echoMood/poeticFragments.js` contient 128 fragments originaux et éditables, répartis en huit champs d’images : eau, croissance, feu, nuit, air, mémoire, lien et matière minérale. Chaque emoji possède deux affinités explicites, pondérées 2 et 1. Ce sont des associations artistiques, sans interprétation psychologique.

Les contributions des 1 à 3 emojis sont additionnées. Une allocation pondérée répartit les 24 fragments entre les thèmes concernés ; aucun thème ne peut en occuper plus de 12. Chaque emoji de la combinaison contribue à la sélection. La seed départage les textes au sein des thèmes ; elle ne remplace pas la correspondance sémantique. Une même combinaison et une même seed reproduisent la sélection. L’ordre des emojis n’a pas d’incidence, conformément au moteur ÉchoMood existant.

Chaque bulle porte un identifiant de texte unique. Lors d’une traversée en FPV, le fragment apparaît au centre de l’écran : 0,8 seconde d’apparition, maintien, puis disparition sur la dernière seconde, pour une présence totale de 5 secondes. Les rencontres pendant l’affichage sont ignorées, sans consommer leur bulle. La bulle acceptée éclate et le compteur « Bulles révélées » augmente. Le délai existant entre rencontres laisse une respiration après le texte. Les changements de mood annulent l’affichage et son timer.

Le texte est du HTML accessible, indépendant de la caméra et sans interaction avec le pilotage. Il n’entre donc pas dans les exports qui capturent uniquement le canvas. Aucun service externe, synthèse vocale ou diagnostic émotionnel.

Vérification automatisée : couverture des 28 emojis, 24 identifiants uniques par sélection, reproductibilité, différences eau/feu et combinaison de trois thèmes, affichage central de 5 secondes, absence de requête vers les voix, ainsi que les régressions ÉchoMood et bulles. Le test d’affichage injecte un événement de collision déterministe ; la détection géométrique est testée séparément. L’appréciation poétique et la lisibilité sur téléphone physique restent à valider.
