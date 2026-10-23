# ÉmoCiel •°

**Compose ton ciel émotionnel et traverse-le tranquillement en 360°.**

Douze symboles météo composent un monde de voiles aquarellés, de ciels pigmentaires et de particules vivantes. Soleil, pluie, vent, brume, orage, braises, arc-en-ciel, neige, aurore, lune, nuages et vagues possèdent chacun leur mouvement. Choisis une à trois nuances, entre, contemple ou laisse-toi porter par un voyage lent. Nuages aux contours diffus, horizon de coucher de soleil, sol lointain brumeux et passages d’oiseaux accompagnent le vol en altitude. Navigation tactile et gyroscope facultatif ; pause accessible à tout moment.

React, Vite, TypeScript et Three.js. Aucun backend, moteur musical, modèle distant ou interprétation des émotions. Les choix restent sur l’appareil.

```sh
npm ci
npm run dev
npm run build
```

Vercel : commande `npm run build`, dossier `dist`. L’application s’ouvre sur la nouvelle expérience, quel que soit l’ancien paramètre d’URL.

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/simple-cosmo.spec.js tests/weather-composition.spec.js tests/painterly-sky.spec.js
```

[Architecture, performances et limites](docs/emociel-simple.md). Les anciens parcours sont conservés dans les sources pour archivage ; ils ne sont plus chargés par l’application. Les anciennes sauvegardes restent intactes.
