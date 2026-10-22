# Correction de la plongée continue en 360°

Base : main `6c4f00c`, avec les rencontres vivantes conservées. Le contrôleur incrémental v3 est repris depuis `abf2eca`.

## Défaut reproduit

En contemplation, le geste tactile utilisait encore la commande de vitesse du vol : après un glissement vertical, un doigt maintenu immobile conservait une valeur Y non nulle. Chaque image ajoutait donc une nouvelle inclinaison vers le bas, tout en empêchant le gyro de reprendre le contrôle. Le test dédié a constaté environ 0,25 radian de descente supplémentaire sans mouvement du doigt.

## Comportement corrigé

- En contemplation, les déplacements tactiles sont des deltas consommés une seule fois, proportionnés aux dimensions du viewport.
- Un doigt immobile n'est plus une commande de rotation permanente. Le gyro peut reprendre après 180 ms sans nouveau mouvement tactile, même si le doigt reste posé.
- Voyager conserve le pilotage continu volontaire. Changement de mode, perte de focus, changement d'orientation écran et redimensionnement libèrent le geste actif.
- L'entrée en gyro choisit une référence verticale neutre ; le regard y revient avec l'interpolation existante.
- Le bouton ⟲ « Recentrer l’horizon », affiché lorsque le gyro est actif, refait cette référence sans demander une nouvelle permission ou déplacer le point de vue.

`navigationInput.ts` porte l'état et la règle de priorité commune au traitement du capteur et au rendu, pour éviter qu'un doigt immobile bloque l'un mais pas l'autre.

## Vérification

Build TypeScript/Vite réussi. Neuf tests ciblés réussis : gestes verticaux puis maintien immobile, reprise du gyro pendant ce maintien, recentrage, roulis, passage vertical, tour complet, interruptions du capteur et flux d'orientation durant 35 secondes réelles. L'échec avant correction puis la réussite après correction concernent une reproduction navigateur du geste décrit ; la confirmation sur le téléphone réel reste nécessaire.
