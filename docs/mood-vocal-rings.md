# Passages vocaux et ciel ÉchoMood

Les 24 MP3 locaux de `public/voices` sont chargés par le lecteur existant. Chaque bulle représente un fragment, sans inventer de transcription ni lui attribuer un sens émotionnel.

En vue drone FPV, une traversée du volume de la bulle, propose sa voix. La détection emploie le segment du déplacement relatif à la bulle flottante dans le même repère 3D que le vol. Les intersections apparentes à l’écran ne suffisent pas. En sculpture directe, gyro et vue globale, aucune voix n’est déclenchée par le vol masqué.

Une seule voix peut jouer, y compris pendant la préparation asynchrone. Les nouvelles rencontres sont ignorées pendant une lecture. Après un déclenchement, silence minimal de 10 secondes et indisponibilité de cette bulle pendant 24 secondes. Le lecteur conserve le MP3 intégral et applique une entrée de 80 ms. Une réaction douce de transparence et de taille marque une émission réelle.

Le ciel est une sphère intérieure de papier teinté : deux pigments du mood, lavis directionnels continus sans couture UV et dérive lente. Une géométrie et un shader, sans texture ou rendu supplémentaire. Les ressources sont libérées lors du changement de mood et à la destruction. Les brosses et le moteur de vol ne sont pas réécrits.

## Vérifications

- 10 tests réussis : anneaux, ciel, ÉchoMood et pilotage tactile.
- 3 tests anneaux/ciel/lecture réussis après ajout du contrôle des 24 MP3 : 11 tests distincts au total.
- Compilation Vite, Prettier et contrôle git diff réussis.
- Lecture vérifiée par Web Audio sous Chromium automatisé : écoute artistique et essais sur téléphone physique restent à réaliser.

Les bulles translucides dérivent lentement autour de positions distribuées, sans poursuivre l’oiseau. Leur shader dessine un bord doux et un reflet discret, sans transmission coûteuse. Leurs positions sont distribuées dans le volume du vol ; l’utilisateur peut les explorer en FPV. Aucun texte poétique n’est déposé dans la scène.

## Remplacement par des bulles

`createVocalBubbles` remplace les anneaux : sphères à géométrie partagée, transparence à effet de bord, dérive lente et collision continue segment/sphère relative au mouvement. Une entrée déclenche la proposition vocale ; rester à l’intérieur ne redéclenche rien. Les délais, les 24 fichiers et l’exclusivité du lecteur sont conservés. Validation de cette évolution : 8 tests ciblés réussis et build Vite réussi. Fluidité sur téléphone physique non vérifiée.

Lorsqu’une voix démarre réellement, sa bulle éclate en 0,7 seconde : légère expansion, membrane ajourée puis dissolution. Elle disparaît définitivement pour cette scène et son matériau GPU est libéré. Une voix refusée ou indisponible ne consomme pas la bulle. Validation : 3 tests ciblés réussis, incluant disparition et décompte de 23 bulles restantes, et build réussi.
