# Ambiance unique et voix successives

Le bouton **♫** est accessible même lorsque l’atelier est replié. Il ouvre l’unique import d’ambiance MP3 globale ; lorsque la piste est chargée, lecture/pause est disponible à côté. Déplier l’atelier affiche le nom, le remplacement et le retrait. Remplacer la musique libère la piste précédente : deux ambiances ne jouent jamais ensemble.

Les douze fragments vocaux sont désormais lus **un à la fois**, sans interruption ni mise en file d’attente. Un nouveau tap ou une écoute est ignoré tant que la voix précédente est en cours. Les autres pads sont indisponibles jusqu’à la fin ; le pad actif reste interactif pour conserver le relâchement tactile et le déverrouillage audio mobile. Une réservation synchrone avant `AudioContext.resume()` empêche également deux taps simultanés de lancer des voix concurrentes.

Les voix traversent un bus d’écho natif Web Audio : retard de **220 ms**, niveau d’écho **16 %**, retour **12 %**, filtre passe-bas **2 200 Hz**. Le son direct reste intact. La musique ne traverse pas cet effet. L’écho décroît doucement après la fin du fragment et fait partie du mix capturé dans les vidéos. Les nœuds sont partagés et libérés avec la banque ; aucune bibliothèque audio ajoutée.

Le mode historique de samples vides conserve ses interactions pour les tests de régression. La sculpture reste sans mots déposés.

Vérifications exécutées : **11 tests ciblés réussis sous Chromium**, couvrant le verrou avant et après reprise audio, l’absence de superposition, la disponibilité du pad suivant après fin de lecture, le premier tap tactile, les douze voix entières, l’ambiance indépendante, les exports PNG/vidéo et leur synchronisation. Un rendu OfflineAudioContext d’impulsion vérifie le signal direct, le retard et la décroissance de l’écho. Build, formatage et diff validés. Téléphone physique non testé.
