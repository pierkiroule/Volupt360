# Volupt360 — NID SONORE•°

Application React + Vite de peinture sonore 3D, issue du monofichier fourni. Le rendu Three.js, les cinq pinceaux, le scratch Web Audio, le vol de caméra et l’export PNG restent dans le navigateur. Aucun serveur applicatif, compte ou secret n’est nécessaire.

## Développement

Node.js 22.12 ou supérieur (Node 24 recommandé) et npm.

```sh
npm ci
npm run dev
```

Le micro requiert HTTPS ou localhost et l’autorisation du navigateur. Importer un fichier audio permet de travailler sans micro. La musique reste locale : elle n’est pas envoyée à un service externe. Le pinceau Splatch noir permet aussi de déposer des taches par clic ou toucher. Les autres pinceaux réagissent aux variations sonores ; le silence ou un son stable ne produit pas nécessairement de tracé.

```sh
npm run build
npm run preview
npm run format:check
```

## Structure

- `src/components/` : en-tête, commandes et sélection des pinceaux React.
- `src/App.jsx` : montage et démontage du moteur, message d’erreur WebGL.
- `src/engine/createSoundNest.js` : scène, pinceaux, caméra, scratch et export ; adaptateur impératif isolé pour conserver le comportement du prototype, sans mise à jour React à chaque image.
- `src/engine/shaders/` : shaders GLSL importés par Vite, sans CDN à l’exécution.
- `src/audio/audioGraph.js` : création de l’analyseur, caractéristiques sonores et buffer inversé.
- `src/styles.css` : apparence originale et adaptations mobiles.
- `tests/` : tests fonctionnels Playwright (rendu, pinceaux, caméra, export, lecture audio, scratch et mobile).

Le démontage arrête l’animation, les pistes micro, les sources audio et les écouteurs, puis libère les ressources WebGL et les URL audio.

## Tests navigateur

Sur une machine avec accès au CDN Playwright :

```sh
npx playwright install chromium
npm test
```

Dans cet environnement cloud, Chromium est déjà installé :

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test
```

Les tests utilisent une fixture WAV générée localement et le rendu logiciel WebGL. Le micro physique, le partage natif mobile et tous les formats MP3 nécessitent une vérification sur les appareils visés.

## Déploiement Vercel

1. Pousser ce projet dans `pierkiroule/Volupt360`, puis importer ce dépôt dans Vercel.
2. Choisir **Vite**, avec le répertoire racine du projet (celui contenant `package.json`).
3. Utiliser `npm ci` pour l’installation, `npm run build` pour le build et `dist` comme sortie. `vercel.json` fixe le framework, le build et la sortie.
4. Déployer. Vercel fournit HTTPS pour l’accès au micro ; aucune variable d’environnement n’est requise.

Le projet utilise une seule page sans routeur : aucune réécriture SPA supplémentaire n’est nécessaire. Le déploiement Vercel n’a pas été exécuté pendant la conversion.
