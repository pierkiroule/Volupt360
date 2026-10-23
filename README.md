# ÉmoCiel •°

**Compose ton ciel émotionnel et traverse-le tranquillement en 360°.**

Douze symboles météo composent un monde de voiles aquarellés, de ciels pigmentaires et de particules vivantes. Soleil, pluie, vent, brume, orage, éclaircies, arc-en-ciel, neige, aurore, lune, nuages et averses possèdent chacun leur mouvement. Choisis une à trois nuances, entre, contemple ou laisse-toi porter par un voyage lent. Traînées pigmentaires et grappes de particules viennent animer les espaces entre les nuages. Nuages aux contours diffus, horizon de coucher de soleil, sol lointain brumeux et passages d’oiseaux accompagnent le vol en altitude. Navigation tactile et gyroscope facultatif ; pause accessible à tout moment.

React, Vite, TypeScript et Three.js. Aucun backend, moteur musical, modèle 3D distant ou interprétation des émotions. Une connexion à Wikimedia Commons permet d’afficher jusqu’à six photos de nature dans des disques flottants au rendu aquarellé, renouvelées à chaque ouverture lorsque des candidats sont disponibles ; sources et licences restent accessibles discrètement. Sans réseau, le ciel procédural fonctionne. Les choix restent sur l’appareil.

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
