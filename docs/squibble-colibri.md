# Squibble le colibris •°

L’accueil propose douze ingrédients poétiques. Une sélection de un à trois émojis fait éclore un monde de vingt-quatre bulles, issu d’un catalogue éditable de trente ressources. Les associations inspirent une composition ; elles ne constituent aucune analyse psychologique.

## Organisation

- `src/colibri/resources.ts` : palette, récits originaux, invitations, citations attribuées, images locales et sélection déterministe.
- `BubbleField.ts` : membranes nacrées, grain aquarellé, positions et dérive lente, chargements locaux limités et nettoyage GPU.
- `ColibriWorld.tsx` : même monde miniature et immersif, petit colibri, navigation inertielle et rencontres géométriques 3D. Le relâchement oriente doucement vers une bulle non visitée ; aucune téléportation.
- `ColibriApp.tsx` / `colibri.css` : disque, palette circulaire, ressources accessibles, carnet explicite et commandes du vol.

Les images viennent des fichiers Feu et Vague présents dans `public/textures`. Les autres bulles portent une matière procédurale nacrée. Aucun service distant, ni dépendance supplémentaire. Les citations sont attribuées ; les traductions libres sont indiquées.

Le son optionnel réutilise l’AudioEngine natif de l’atelier pour une résonance douce aux rencontres. Il ne s’agit pas d’une bande-son musicale continue. Le gyroscope nécessite HTTPS et, selon le navigateur, une autorisation. Le glissement tactile reste disponible. Une pause et un retour au disque sont toujours accessibles.

Le carnet n’est enregistré sur cet appareil qu’après « Garder cette étincelle ». Il peut être relu et vidé ressource par ressource. Aucun score, compte à rebours ni objectif de collecte.

## Préservation / retour

L’atelier complet et ses projets IndexedDB restent disponibles à `?studio`. Les routes historiques sont conservées. Pour revenir à l’accueil précédent, remplacer le dernier `ColibriApp` par `StudioApp` dans `src/main.jsx`. Aucune migration des créations n’est nécessaire.

## Vérification

`npm run build`

`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/colibri.spec.js tests/studio.spec.js`

Les tests navigateur couvrent la sélection, la diversité déterministe, la rencontre physique pendant le vol, l’ouverture d’une ressource, le carnet persistant, la pause et l’accès à l’atelier sur viewport mobile. Le gyroscope matériel et les performances sur téléphone réel doivent être validés sur appareil. Le monde conserve un maximum de 24 membranes partagées, des textures 256² et un pixel ratio limité à 1,5.
