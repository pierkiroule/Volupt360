# Lucioles vocales

Les 24 MP3 de `public/voices` sont chargés localement par la banque existante. Ils sont indépendants des douze brosses. Les pads déclenchent des dépôts brefs ou continus au maintien ; une voix en cours module leurs paramètres acoustiques. Sans voix, les pads utilisent une impulsion plastique douce et silencieuse.

`createVocalFireflies` crée 24 corps colorés et 24 anneaux réutilisés, avec des géométries partagées. Un hasard reproductible définit des orbites inclinées, des vitesses et des altitudes différentes. Une collision est détectée sur le déplacement relatif entre deux images, à moins de 2,3 unités. Le contact ajoute une impulsion amortie et une période de protection de 12 secondes. Une émission effective déclenche un anneau de 1,5 seconde. Les ressources sont libérées lors du changement de source et de la destruction de la scène.

La banque réserve la lecture avant toute attente de reprise audio : aucun chevauchement, aucune file d’attente. Une luciole touchée pendant une voix se dévie sans lancer de nouvelle voix. Le premier geste utilisateur sur un pad autorise l’audio ; aucun autoplay vocal avant ce geste. L’onde est uniquement visuelle : aucun écho sonore. Le mode photo fige aussi les lucioles.

Validation exécutée : trois tests Chromium couvrent le chargement des 24 fragments, les pads sans vocal, la lecture exclusive (dont le fragment 24), le contact et sa déviation, l’anneau après émission et une simulation de trois minutes de vol libre avec rencontres naturelles et nombre constant d’objets. Build Vite réussi. La simulation utilise une réponse vocale factice pour mesurer les rencontres ; le test de banque utilise les véritables fichiers audio. Mobile physique et exports non retestés dans cette évolution. Les anciens tests de déclenchement des voix par pads correspondent au comportement remplacé.

Désactivation : `VITE_ENABLE_SONOIZO=false` restaure le moteur historique. `?samples=empty` conserve l’atelier de samples locaux, sans lucioles.
