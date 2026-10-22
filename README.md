# ÉmoCiel •°

**Compose ton ciel émotionnel et traverse-le tranquillement en 360°.**

Une petite palette de six émotions colore un monde de voiles aquarellés. Choisis une à trois nuances, entre, contemple ou laisse-toi porter par un voyage lent. Navigation tactile et gyroscope facultatif ; pause accessible à tout moment.

React, Vite, TypeScript et Three.js. Aucun backend, moteur musical, modèle distant ou interprétation des émotions. Les choix restent sur l’appareil.

```sh
npm ci
npm run dev
npm run build
```

Vercel : commande `npm run build`, dossier `dist`. L’application s’ouvre sur la nouvelle expérience, quel que soit l’ancien paramètre d’URL.

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/simple-cosmo.spec.js
```

[Architecture, performances et limites](docs/emociel-simple.md). Les anciens parcours sont conservés dans les sources pour archivage ; ils ne sont plus chargés par l’application. Les anciennes sauvegardes restent intactes.
