# ÉCHO & HYPNOS •° — trois compositions ambient

Le moteur utilise exclusivement Web Audio natif et un AudioWorklet DSP. Aucun sample, service externe ou bibliothèque musicale. Les anciens moteurs sont conservés pour comparaison avec `?sound=legacy` ou `?instrument=off`.

## Trois systèmes

| Univers | Palette                                                                                                 | Motifs et transformation                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| ÉTHER   | Synthèse additive, nappes maj7 / add9 / sus2 ouvertes, cloches FM douces, réverbération de 4,5 secondes | Trois horloges de 13,7 / 21,1 / 31,3 secondes, motifs ouverts, omissions, harmonie sur 137 secondes.                                            |
| ABYSSE  | Bourdons chaleureux, cordes Karplus–Strong, turbulence discrète, filtres et delays sombres              | Horloges de 19,3 / 29,7 / 41,1 secondes, cellules descendantes inachevées, apparition plus rare, harmonie sur 173 secondes.                     |
| MÉMOIRE | Timbre feutré par FM douce et partiels, nappes mineures, échos filtrés à 3,7 / 6,11 / 10,3 secondes     | Horloges de 8,9 / 14,3 / 23,7 secondes, cellules de 3 à 5 notes, mémoire des degrés déjà joués, retours transformés, harmonie sur 109 secondes. |

Ces durées reçoivent une variation bornée de trois pour cent. Les notes proviennent de motifs écrits et de gammes cohérentes. Les apparitions peuvent être omises. Les premiers événements sont espacés ; les notes ne suivent plus une grille de percussion commune. Les transitions harmoniques des nappes sont lissées sur plusieurs dizaines de secondes. L’inspiration porte sur des principes de composition ambient, sans reprendre un morceau.

## Modules

`AmbientComposer` est indépendant du rendu et du navigateur audio : horloges, motifs, probabilités, mémoire de 64 événements, hasard reproductible. L’ordonnanceur prépare les notes sur l’horloge Web Audio et évite les rafales de rattrapage.

`WaterDSP` conserve les matières procédurales et ajoute cordes à ligne à retard Karplus–Strong, cloches FM et timbres feutrés. Les nappes restent additives, à phases légèrement désynchronisées ; quatre paramètres audio de hauteur permettent les transitions harmoniques. Les effets sont des nœuds Web Audio natifs.

`createAmbientMixer` prépare les trois moteurs dans le même AudioContext, conserve leurs phrases et mélange leurs sorties par gains à puissance constante. Les changements de proportions sont lissés et le mix global passe par un compresseur. Les mondes inaudibles sont suspendus après le fondu. Les temporisateurs sont annulés à chaque nouvelle demande, en pause et à la destruction. Chaque monde conserve ses plafonds de dix voix et sa mémoire bornée ; le mélange prépare trois graphes, ce qui augmente le coût mémoire par rapport à un seul univers. Les essais sur téléphone physique restent nécessaires.

## Interface et contrôles

Trois sphères organiques accessibles au toucher et au clavier sélectionnent et préécoutent les univers. Un glissement horizontal mélange deux voisins. Le bouton « Entrer dans le paysage » ouvre la sculpture avec les brosses du monde dominant. Le bouton ◇ retrouve les sphères sans couper la composition. Les proportions et les contrôles sont conservés.

ÉCHO augmente les retours filtrés et la probabilité de rappeler des événements dans MÉMOIRE. HYPNOS allonge les cycles et les résonances, raréfie les apparitions et adoucit le spectre. Les réglages sont appliqués aux trois moteurs. Ils n’étaient pas présents dans l’interface précédente et ont été ajoutés dans ce panneau.

La peinture conserve le dialogue géométrique : positions et formes infléchissent les notes, les nappes et la spatialisation ; une note rejouée réveille la matière de sa trace. Les brosses, le vol, les caméras et les connexions de capture sont réutilisés. Le mode photo et la perte de visibilité interrompent les moteurs et leurs calculs.

## Vérification

Les tests dédiés simulent deux heures de composition pour chaque univers : reproductibilité, densités différentes, raréfaction par HYPNOS et mémoire bornée. Un AudioContext et les AudioWorklets réels vérifient les niveaux, le mélange, les paramètres et le silence après pause. Le parcours mobile contrôle les sphères, le glissement, les réglages, la peinture et l’absence de requête MP3 ou d’erreur JavaScript.

La qualité artistique n’est pas validée par ces mesures : casque et téléphone physiques restent à écouter. L’encodage vidéo complet n’a pas été rejoué ; le signal PCM horodaté reste contrôlé. L’export vidéo conserve son format mono existant.

Validation exécutée : 20 tests ciblés ont passé (ambient, profondeur/résonance, audio, capture et navigation tactile). Les six tests ambient/résonance ont aussi passé après la sécurisation du premier toucher. Build et contrôle de formatage passent. Les trois tests ambient ont également passé après les derniers ajustements de palettes et d’accords ouverts.
