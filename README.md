# EmoCiel360 — Composer et traverser son ciel

Le visiteur fait tourner une bulle 3D et dépose à sa surface des tags émojis qu’il
choisit lui-même. Les couleurs se rencontrent et composent progressivement un ciel
animé. Un glissement fait tourner la bulle ; un toucher bref dépose un tag. Le choix
« Retirer » enlève le tag le plus proche du point touché. Présence du ressenti,
annuler/rétablir et mot personnel facultatif complètent une petite palette de douze
repères émotionnels.

## Entrer, contempler, traverser

« Entrer dans ma bulle » ouvre le même ciel à 360°, orienté vers le dernier dépôt.
La contemplation maintient la position de la caméra : le doigt et le gyroscope
orientent uniquement le regard. Le vol FPV réactive le déplacement : maintenir
accélère progressivement, glisser oriente le vol, relâcher retrouve une trajectoire
accompagnée qui reste près du ciel. Le bouton « Contempler » interrompt le voyage.
Le gyroscope est facultatif et conserve une alternative tactile.

Les animations sont autonomes et silencieuses. Les tags ne déclenchent ni analyse
audio ni musique. Les variations de matière, grains et filaments réutilisent le
moteur Three.js existant. La préférence de réduction des mouvements est respectée.

## Explorer une dynamique, sans corriger ses émotions

Cinq présentations sont proposées : Mon ciel, Faire de la place, Chercher un appui,
Faire des liens, Un autre regard. Les variations concernent l’espace, l’éclairage
ou les courants visuels ; elles ne suppriment ni ne remplacent les ressentis.
Elles sont réversibles. Une question métaphorique s’ouvre uniquement lorsque le
visiteur choisit une piste. Elle peut être fermée immédiatement ou remplacée par
une autre invitation. Aucune réponse n’est exigée ou enregistrée.

« Lire mon ciel » décrit exclusivement les choix déclarés : nombre de tags,
diversité des ressentis nommés, voisinages et répartition géométrique. Il ne classe
pas les émotions en bonnes ou mauvaises, n’attribue aucun score psychologique et
n’infère ni diagnostic, ni risque, ni efficacité thérapeutique. Ambivalence,
contraste et coexistence sont des lectures que la personne peut choisir elle-même.
Un besoin facultatif peut servir à choisir explicitement une piste d’exploration.

## Architecture

- `src/emociel/skyModel.js` : palette, questions, texture de la bulle et descriptif
  des déclarations et voisinages géométriques.
- `src/emociel/OrbEditor.jsx` : bulle 3D, rotation et dépôt par raycasting UV.
- `src/emociel/OrbExperience.jsx` : composition, historique, contemplation, FPV,
  besoins et invitations.
- `src/resonant/createResonantWorld.js` : déploiement intérieur, animation autonome
  et variations visuelles progressives.
- `src/engine/createCameraRig.js` : blocage de la translation en contemplation et
  navigation FPV existante réutilisée.

Les textures sont recalculées uniquement lors d’un dépôt ou d’une modification.
L’extérieur et l’intérieur partagent les mêmes tags et la même projection de ciel.
La texture de 1536 × 768 pixels est réutilisée. L’éditeur extérieur ne rend pas
pendant la visite intérieure ; son ratio de pixels est plafonné à 1,6. Les effets
intérieurs conservent les budgets mobiles précédents. Ressources, écouteurs et
boucles sont libérés à la fermeture.

## Données et limites

La composition et les mots restent uniquement en mémoire dans l’onglet. Aucun
backend, compte, partage ou sauvegarde automatique. Le parcours actuel ne propose
pas encore d’export de projet. Fermer ou recharger la page réinitialise la création.
La bulle est limitée à 96 tags et l’historique à 80 étapes. Le descriptif spatial
est géométrique et ne constitue pas une mesure psychologique de complexité.

Le rendu intérieur est une projection panoramique en relief, pas une reconstruction
volumétrique physique. Les symboles peuvent se déformer près des pôles. Le matériel
physique (gyroscope et performances prolongées Android/iOS) reste à vérifier.
L’outil constitue une exploration artistique ; aucune efficacité thérapeutique
validée n’est revendiquée.

Les anciens ateliers restent accessibles avec `?peinture` (aquarelle), `?resonant`
(dessin classique/MP3), `?atelier`, `?legacy`, `?classic`, `?conte` ou `?original`.

## Développement et vérifications

Node.js 22.12 minimum, Node 24 recommandé.

```sh
npm ci
npm run dev
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/orb-experience.spec.js tests/emociel.spec.js tests/resonant-paint.spec.js tests/spatial-workshop.spec.js
```

Vercel : `npm run build`, sortie `dist`. Pas de clé API ni dépendance ajoutée.
