# Senso360•° — Mon paysage sensoriel

Un atelier de squiggles (opacité appliquée au trait complet, et non à chaque tampon superposé) : dessiner sur un papier 2D, puis entrer dans une interprétation 3D et musicale du même tableau.

Le papier propose dix matières symboliques, avec émojis et noms visibles : **Fil, Vague, Roche, Étincelles, Empreinte, Soie, Nuage, Givre, Braise et Spirale**. Leur signification reste libre ; aucune émotion ni interprétation psychologique n’est déduite du choix. La palette défile horizontalement et toute la barre se replie. Couleur, taille et opacité sont regroupées dans « Réglages », fermé par défaut ; annuler reste directement accessible.

Les émojis sont des invitations ouvertes : 🧵 tension/lien, 🌊 ondulation/flux, 🪨 densité/appui, ⚡ picotement/vibration, 🫧 expansion/pulsation, 🪶 légèreté/effleurement, 🌫️ diffusion/enveloppement, ❄️ fraîcheur/grain, 🔥 chaleur/rayonnement, 🌀 rotation/circulation. Ces mots ne constituent ni une liste exhaustive des sensations ni une interprétation clinique. Leur sens appartient à la personne.

Le parcours éducatif propose d’évoquer librement une situation, de dessiner ses sensations puis d’explorer le paysage sous une autre perspective. Aucun récit personnel n’est demandé ni enregistré. Le dessin reste local à la session. Il n’y a ni diagnostic ni revendication d’efficacité hypnothérapeutique démontrée.

Les signatures sensorielles sont modifiables dans `src/chill/sensoryQualities.js`. Chaque matière possède une bande spectrale, une inertie, une réponse aux transitoires, une humidité et une vitesse propres. Les mêmes enveloppes accompagnent les dépôts actifs et archivés ; les anciens modes conservent leur réponse par défaut.

Les traits, leurs points et leurs réglages sont la source du document. La version 3D déploie cette composition autour du spectateur sur des surfaces courbes, avec une séparation progressive des couches. L’opacité conserve son rôle de transparence. Le retour en 2D retrouve le tableau intact ; les modifications suivantes alimentent la prochaine construction 3D.

Le monde devient un audiovisualiseur à 360° : Gravity anime les pigments et les particules, y compris les dépôts archivés. Gyroscope, gestes et molette orientent le regard. Le gyroscope est demandé dès l’entrée en 3D (glissement tactile en secours). Pendant le voyage, le regard infléchit progressivement le cap, comme un drone, avec accélération et arrêt amortis. Pause du voyage arrête progressivement la translation sans arrêter la musique.

Un bouton VR apparaît si WebXR annonce une session immersive disponible. L’entrée utilise le renderer XR natif de Three.js et présente le monde depuis son centre ; le casque contrôle le regard. Le casque oriente également le voyage FPV ; aucune peinture aux contrôleurs. L’exécution sur casque physique reste à valider.

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
