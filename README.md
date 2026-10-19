# OIZO •° — Un trait, plusieurs mondes

Un atelier de squiggles : dessiner sur un papier 2D, puis entrer dans une interprétation 3D et musicale du même tableau.

Le papier propose cinq matières symboliques, avec pictogrammes et noms visibles : **Fil, Vague, Roche, Étincelles et Empreinte**. Leur signification reste libre ; aucune émotion ni interprétation psychologique n’est déduite du choix. Couleur, taille, opacité et annulation restent accessibles.

Les traits, leurs points et leurs réglages sont la source du document. La version 3D déploie cette composition autour du spectateur sur des surfaces courbes, avec une séparation progressive des couches. L’opacité conserve son rôle de transparence. Le retour en 2D retrouve le tableau intact ; les modifications suivantes alimentent la prochaine construction 3D.

Le monde devient un audiovisualiseur à 360° : Gravity anime les pigments et les particules, y compris les dépôts archivés. Gyroscope, gestes et molette orientent le regard. Voyager mémorise une direction ; regarder ailleurs ne change pas le cap. Pause du voyage arrête progressivement la translation sans arrêter la musique.

Un bouton VR apparaît si WebXR annonce une session immersive disponible. L’entrée utilise le renderer XR natif de Three.js et présente le monde depuis son centre ; le casque contrôle le regard. Cette première entrée est un mode de contemplation, sans peinture aux contrôleurs. L’exécution sur casque physique reste à valider.

Les textures détaillées sont générées une fois par brosse et réutilisées. Le rendu GPU est suspendu pendant le dessin 2D ; la source raster et les données des traits restent en mémoire dans la session. Aucun backend ni traitement de données émotionnelles. L’application est une médiation artistique, sans revendication d’efficacité thérapeutique.

Les anciens parcours restent accessibles via `?conte=1` et `?original=1`.

## Développement

Node.js 22.12 ou supérieur (Node 24 recommandé) et npm.

```sh
npm ci
npm run dev
npm run build
npm run preview
npm run format:check
```

WebGL et Web Audio sont nécessaires. L’orientation mobile nécessite HTTPS (ou localhost), un capteur compatible et, selon l’appareil, l’autorisation native du navigateur.

## Déploiement

Vercel : commande `npm run build`, répertoire de sortie `dist`. Aucun backend ni secret nécessaire. Le MP3 importé est lu localement ; aucun fichier n’est téléversé.

## Tests

```sh
npx playwright install chromium
npm test -- tests/oizo-bulle.spec.js tests/oizo-chill.spec.js tests/six-minute-experience.spec.js tests/point-flight.spec.js tests/haikuarelle.spec.js tests/living-pigments.spec.js tests/watercolor-alpha.spec.js
```

L’ancien atelier MP3 reste disponible à `/?atelier=mp3`. Ses fonctions et les modules musicaux historiques ne définissent pas le parcours principal.
