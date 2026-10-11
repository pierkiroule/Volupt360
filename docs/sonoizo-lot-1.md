# SONOÏZO•° — Lot 1 : Cueillir

Branche : `feature/sonoizo`, créée depuis `f8ebab6`. Le lot 1 ajoute la collecte et le jeu sonore ; aucun moteur de peinture ou de caméra n’a été réécrit.

## Audit avant modification

React 19 et Vite 7, Three.js 0.164.1 ; pas de backend. `src/App.jsx` coordonne les composants, le lecteur audio et la scène. Les douze brosses sont déclarées dans `src/engine/brushes.js` :

| Nom          | Identifiant    | Singularité existante                                |
| ------------ | -------------- | ---------------------------------------------------- |
| Voiles       | `voiles`       | Deux rubans amples, lavis diaphane                   |
| Falaises     | `falaises`     | Deux strates épaisses, granulation minérale          |
| Corolles     | `corolles`     | Trois surfaces plissées à nervures                   |
| Filaments    | `filaments`    | Quatre lignes fines avec section tubulaire           |
| Encres       | `brumes`       | Taches noires déposées le long du mouvement          |
| Éclats       | `lagons`       | Éclaboussures noires et satellites                   |
| Bulles       | `bulles`       | Sphères translucides multicolores                    |
| Aurore       | `aurore`       | Trois voiles irisés et torsadés                      |
| Calligraphie | `calligraphie` | Un ruban à pleins et déliés                          |
| Network      | `network`      | Liens et nœuds regroupés dans une géométrie          |
| Dilution     | `dilution`     | Deux lavis diffus à auréoles                         |
| Echo         | `echo`         | Trois rubans, retards de quatre et huit échantillons |

`createSoundNest.js` gère WebGL, les dépôts, le cycle d’effacement, les bornes spatiales et la destruction. `createPainterFlight.js` définit les trajectoires audio-réactives. `createCameraRig.js` gère le drone avec réglage de distance, la contemplation centrale et le gyro. Les gestes sur le canvas font tourner la sculpture ; ils ne peignent pas.

Les shaders, `TextureFactory.js`, `createGenerativeMaterials.js` et `importBrushTexture.js` produisent et appliquent les matières. Vingt-quatre masques sont préparés hors rendu, les références sont comptées et libérées ; l’image personnelle importée par appui long a priorité. Le plafond de quatre-vingts tracés, la dissolution graduelle, les buffers bornés et le pixel ratio limité à 1,5 protègent le rendu mobile.

`createLoopPlayer.js` décode les fichiers locaux et lit des boucles Web Audio précises ; `analyzeLoops.js` détermine les régions. `audioGraph.js` calcule les caractéristiques acoustiques. Aucun enregistreur microphone, scratch ou export PNG n’était présent au départ. Ce lot ajoute le microphone ; il ne recrée pas l’export PNG ou le scratch. L’ajout d’un export PNG devra faire l’objet d’un lot distinct.

## Architecture et périmètre

- `src/sonoizo/createTwigBank.js` : banque indépendante, douze emplacements au maximum, un enregistrement à la fois, jusqu’à douze voix simultanées. MediaRecorder natif, décodage Web Audio et conversion hors ligne en mono 24 kHz, dix secondes maximum. Les douze buffers représentent au maximum 11,52 Mo de PCM, hors buffers temporaires du décodage et allocations du navigateur. Les très courts sons de moins de 40 ms sont refusés.
- `src/sonoizo/useTwigBank.js` : durée de vie de la banque et liaison React. Le changement d’onglet du navigateur annule la capture et les lectures ; la perte de focus arrête les voix. Les flux microphone, timers et AudioContext sont libérés à la fermeture.
- `src/components/TwigWorkshop.jsx` : douze emplacements identifiés par les brosses. Cueillir permet d’enregistrer, écouter, remplacer et supprimer ; Jouer permet les taps, le maintien et les accords. Un maintien d’au moins 300 ms active la boucle native, le relâchement l’arrête avec une courte enveloppe. Les extrémités des samples sont adoucies sur quatre millisecondes.
- `src/sonoizo/config.js` et `.env.example` : activation réversible au build.
- `src/App.jsx`, `Header.jsx`, `src/styles.css`, `index.html` : identité SONOÏZO, accès Cueillir/Jouer/MP3 et interface mobile. Le lecteur MP3 est mis en pause en quittant son atelier ; le bouquet reste disponible entre les modes.
- `tests/sonoizo.spec.js` : contrôles du nouveau lot. Les tests antérieurs ouvrent `/?atelier=mp3` pour vérifier les fonctions préexistantes dans leur atelier explicite.

Les buffers restent dans la mémoire de l’onglet : pas de serveur, pas de téléchargement automatique, pas de stockage persistant. Un remplacement annulé ou refusé conserve la brindille précédente. Les demandes de permission, reprises audio et décodages tardifs sont ignorés après annulation ou destruction. Les pads ne modifient pas les dépôts graphiques dans ce lot ; la scène actuelle reste contemplable et le mode MP3 continue à peindre.

SonoizoDance, BrushBridge, l’oizo•°, Le Nid et les autres champs appartiennent aux lots suivants. Aucune de ces fonctions n’est simulée ou déclarée réalisée dans cette livraison.

## Désactivation immédiate

Définir `VITE_ENABLE_SONOIZO=false` dans l’environnement de build Vercel, puis reconstruire et redéployer. Localement : `VITE_ENABLE_SONOIZO=false npm run build`. L’interface revient directement à l’atelier MP3, sans initialiser la banque sonore. Revenir à `true` ou retirer la variable pour réactiver. Aucun déploiement ni fusion automatique dans `main`.

## Validation et limites

Les tests de microphone utilisent Chromium avec son périphérique audio factice natif : le flux MediaStream, MediaRecorder, le décodage, le rééchantillonnage et les lecteurs sont réels. Le refus d’autorisation et la réponse tardive sont simulés explicitement. Le rendu Three.js est testé avec WebGL logiciel.

Le contrôle visuel mobile et les tests automatisés ne remplacent pas des essais sur téléphones physiques. Safari/iOS, les permissions système réelles, les microphones matériels et la fluidité sur appareils modestes restent à vérifier. Les boucles de sons très différents peuvent présenter une transition perceptible malgré les enveloppes courtes. Aucun profilage exhaustif du heap ou du pilote GPU.

Résultats exécutés :

- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test` : suite de 33 tests réussie, dont les 26 vérifications antérieures et sept tests du lot 1.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test -- tests/sonoizo.spec.js -g 'leaving MP3'` : test supplémentaire réussi après ajout de la protection contre un MP3 décodé tardivement, soit 34 tests distincts vérifiés.
- `npm run build`, `npm run format:check` et `git diff --check` : réussis.
- `VITE_ENABLE_SONOIZO=false npm run build` : réussi ; contrôle du build servi en preview sous Chromium : NID SONORE visible, douze brosses présentes, navigation SONOÏZO absente et aucun AudioContext créé. Le build actif a été régénéré ensuite.
- Contrôle visuel d’une capture à 390 × 844 : les douze emplacements et les actions de collecte sont accessibles, les vues 3D restent disponibles.

Les tests du lot 1 vérifient l’enregistrement natif, son arrêt automatique, les pistes microphone arrêtées, le remplacement et la suppression, le maintien multitouch avec relâchement individuel, le clavier, le tap simple, la reprise après refus et l’absence de requêtes d’upload. Une capture synthétique de onze secondes vérifie la limite exacte de dix secondes pour les douze buffers avec décodage/rééchantillonnage natifs, les douze voix bornées, le retrigger, la fermeture du contexte et l’ignorance d’une reprise audio tardive. Les pads laissent le nombre de dépôts inchangé dans ce lot.
