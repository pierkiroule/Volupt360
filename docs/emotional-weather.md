# Ma météo émotionnelle •°

Un disque de composition animé devient un ciel spatial à contempler et à traverser. Les émojis sont des outils de composition libre ; l’application n’interprète pas les choix et n’infère aucun état psychologique.

## Parcours

1. Choisir parmi huit phénomènes (soleil, nuages, pluie, orage, vent, brume, neige et crépuscule).
2. Toucher le disque pour déposer une zone pigmentaire animée. Les phénomènes peuvent se superposer.
3. Toucher le centre d’une zone pour la sélectionner et la déplacer ; régler sa proportion et son opacité, ou la retirer.
4. Entrer dans le ciel 3D. Glisser pour regarder autour de soi, activer le gyroscope si disponible, ou lancer un voyage doux à trajectoire bornée autour et au cœur de la composition.
5. Revenir au disque pour modifier le même modèle de zones.

Les contrôles incluent annuler/rétablir, figer/animer et enregistrer. L’enregistrement est explicite, local et sans transmission. Il conserve un ciel, restauré au prochain chargement. Aucun historique émotionnel ni télémétrie. Les autres créations existantes ne sont pas modifiées.

## Architecture

- `weatherModel.ts` : huit palettes, modèle de zones, grain procédural déterministe, validation du ciel enregistré et correspondance spatiale.
- `WeatherDisk.tsx` : rendu Canvas 2D, pigments mis en cache, mouvements et interactions Pointer Events.
- `WeatherWorld.tsx` : nappes aquarellées distribuées en volume, pluie, neige, vent et éclairs graphiques sans flash ; caméra, voyage et gyroscope calibré sur l’orientation courante.
- `WeatherApp.tsx` : état partagé entre les deux vues, outils et historique borné.
- `weather.css` : atelier mobile ivoire.

Limites de ressources : 32 zones, 50 états d’annulation, textures 256², pixel ratio 3D limité à 1,5. Les ressources Three.js et écouteurs sont nettoyés au démontage. Les effets ne constituent pas une simulation physique météorologique. Le disque et le ciel conservent les mêmes identifiants et paramètres, avec une transformation spatiale dédiée ; les deux vues ne sont pas une projection photographique identique.

Les ambiances historiques restent accessibles sous `?colibri` et l’atelier sous `?studio`. Pour désactiver ce parcours, remettre ColibriApp comme route par défaut dans `src/main.jsx`.

## Vérification

`npm run build`

`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/weather.spec.js tests/colibri.spec.js tests/studio.spec.js`

Les vérifications navigateur couvrent dépôt, sélection, déplacement, proportion/opacité, retrait, annulation, conservation entre 2D et 3D, voyage/pause, sauvegarde/rechargement, viewport mobile et validation des données. Le gyroscope matériel et les performances prolongées sur smartphone réel demandent une validation sur appareil. Aucun objectif de 60 FPS n’est déclaré mesuré.
