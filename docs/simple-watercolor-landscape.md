# Paysage aquarelle simplifié

## Parcours actif

La palette fixe est définie dans `src/materials/landscapePalette.js` et affichée par `LandscapeBrushMenu`. Les huit familles réutilisent les géométries et shaders existants ; elles ne remplacent pas les matières par des lignes génériques. Les masques sont préparés une fois au démarrage, en 128 pixels sur mobile et 256 sur ordinateur. Aucun atelier de création ni stockage de palette n’est chargé.

`App` ouvre le MP3 fourni après le geste d’entrée. `createTwigBank` conserve le lecteur, l’analyse Web Audio, la capture et les pauses. La pause manuelle est respectée ; le mode photo suspend temporairement la lecture. Le moteur de composition historique reste accessible seulement par une méthode de compatibilité à import dynamique, jamais appelée dans ce parcours. Le navigateur ne charge donc ni son ordonnanceur ni son worklet de synthèse.

`SonoizoDance` ralentit le vol et amortit les gestes, avec une influence musicale moins brusque sur la trajectoire. Les shaders conservent leur réponse aux caractéristiques musicales complètes. La caméra FPV reste à trois unités avant zoom manuel, sans recul dépendant du son.

## Allègement

Les composants du générateur, son stockage, son ancien adaptateur sonore et ses styles ont été supprimés. Le budget adaptatif de pixels et la limite de traces restent actifs : 56 sur mobile, 80 sur ordinateur. La mémoire et les recherches de collisions inutilisées ne sont pas mises à jour dans le parcours normal. Les ailes articulées, le ciel, la navigation gyro et les exports sont conservés.

## Vérification

Onze tests Chromium ciblés exécutés avec succès : lecture effective du MP3 et énergie mesurée, pauses et reprise, absence de chargement du compositeur, huit brosses, budget mobile simulé, enveloppes musicales, direction des gestes et continuité du vol, distance caméra, ciel, ailes et transitions de vues. Une capture de l’interface mobile a été inspectée.

La qualité perçue à l’écoute, la cadence sur téléphone physique, les autorisations des capteurs mobiles et tous les codecs d’export vidéo ne sont pas validés par ces tests. Les suites historiques consacrées aux anciens générateurs ne décrivent plus l’interface actuelle.
