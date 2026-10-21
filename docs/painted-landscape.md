# Squibble360 — Le disque devient paysage

La route principale est un atelier à douze brosses, une seule active à la fois. L'utilisateur trace dans le disque vu du dessus ; les mêmes positions X/Z, couleurs et opacités deviennent un relief aquarellé dans le monde 360°. Les émojis sont des outils artistiques, sans interprétation ni mesure psychologique.

- `landscapeModel.js` : configuration éditable des douze matières, dépôt à espacement constant, carte de hauteur et texture locale. Les bleus creusent des vallées/cours d'eau, les pigments chauds et minéraux dessinent des crêtes et dunes. Les textures du catalogue sont mélangées aux pigments.
- `LandscapeWorld.jsx` : même terrain en projection orthographique ou perspective, lumière, mouvement discret de l'eau/pigment, navigation tactile et gyroscope. Le voyage revient vers le terrain, avec hauteur minimale au-dessus du relief.
- `SquiggleApp.jsx` : palette circulaire, taille/opacité, annulation, aller-retour peinture/visite, musique et export du regard PNG.

Les anciens moteurs `SquiggleWorld`, rubans et brosses sont conservés. Aucune dépendance ajoutée ; musique, textures, papier et conversion gyroscope réutilisés.

## Limites de cette première version

Le terrain est un champ de hauteur : pas de grottes ni de surplombs. L'eau est une matière de surface animée, pas une simulation hydrodynamique. Le relief et la couleur sont recalculés pendant le dessin (prévisualisation limitée à environ 12 Hz), jamais par frame pendant la visite. La géométrie est plafonnée à 12 769 sommets sur petit écran et 25 921 sur ordinateur ; 80 traits de 300 points maximum, sans effacement automatique. Annuler libère une place.

Le dessin reste dans la session : aucune sauvegarde durable du projet n'est annoncée. Le PNG exporte le point de vue sans interface. Tester le gyroscope et les performances sur matériel Android/iOS réel avant livraison publique ; les tests Chromium émulent le mobile et les événements capteurs.
