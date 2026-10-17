# Passages vocaux et ciel ÉchoMood

Les 24 MP3 locaux de `public/voices` sont chargés par le lecteur existant. Chaque anneau représente un fragment, sans inventer de transcription ni lui attribuer un sens émotionnel.

En vue drone FPV, une traversée du plan de l’anneau, à l’intérieur de son ouverture, propose sa voix. La détection emploie le segment du déplacement dans le même repère 3D que le vol. Les intersections apparentes à l’écran ne suffisent pas. En sculpture directe, gyro et vue globale, aucune voix n’est déclenchée par le vol masqué.

Une seule voix peut jouer, y compris pendant la préparation asynchrone. Les nouvelles rencontres sont ignorées pendant une lecture. Après un déclenchement, silence minimal de 10 secondes et indisponibilité de cet anneau pendant 24 secondes. Le lecteur conserve le MP3 intégral et applique une entrée de 80 ms. Une réaction douce de transparence et de taille marque une émission réelle.

Le ciel est une sphère intérieure de papier teinté : deux pigments du mood, lavis directionnels continus sans couture UV et dérive lente. Une géométrie et un shader, sans texture ou rendu supplémentaire. Les ressources sont libérées lors du changement de mood et à la destruction. Les brosses et le moteur de vol ne sont pas réécrits.

## Vérifications

- 10 tests réussis : anneaux, ciel, ÉchoMood et pilotage tactile.
- 3 tests anneaux/ciel/lecture réussis après ajout du contrôle des 24 MP3 : 11 tests distincts au total.
- Compilation Vite, Prettier et contrôle git diff réussis.
- Lecture vérifiée par Web Audio sous Chromium automatisé : écoute artistique et essais sur téléphone physique restent à réaliser.

Les anneaux sont des passages de position fixe avec une respiration légère, pas des cibles qui poursuivent l’oiseau. Leurs positions sont distribuées dans le volume du vol ; l’utilisateur peut les explorer en FPV. Aucun texte poétique n’est déposé dans la scène.
