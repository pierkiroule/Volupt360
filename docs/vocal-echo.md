# Ambiance unique et voix successives

Le bouton **♫** est accessible même lorsque l’atelier est replié. Il ouvre l’unique import d’ambiance MP3 globale ; lorsque la piste est chargée, lecture/pause est disponible à côté. Déplier l’atelier affiche le nom, le remplacement et le retrait. Remplacer la musique libère la piste précédente : deux ambiances ne jouent jamais ensemble.

Les douze fragments vocaux sont désormais lus **un à la fois**, sans interruption ni mise en file d’attente. Un nouveau tap ou une écoute est ignoré tant que la voix précédente est en cours. Les autres pads sont indisponibles jusqu’à la fin ; le pad actif reste interactif pour conserver le relâchement tactile et le déverrouillage audio mobile. Une réservation synchrone avant `AudioContext.resume()` empêche également deux taps simultanés de lancer des voix concurrentes.

Les voix sont diffusées directement, sans écho ni retard ajouté. Le mix des vidéos conserve les voix et l’ambiance musicale.

Le mode historique de samples vides conserve ses interactions pour les tests de régression. La sculpture reste sans mots déposés.

Les tests associés couvrent la réservation vocale, la lecture successive et l’import d’ambiance depuis l’atelier replié. Téléphone physique non testé.
