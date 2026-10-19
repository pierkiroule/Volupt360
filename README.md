# Mandala en résonance •° — Un dessin, un monde

**Choisir 1 à 3 émojis → faire éclore un mandala → entrer dans son paysage 3D.**

La palette de douze symboles propose des inspirations sensorielles ouvertes. Aucun
symbole n’est déposé dans l’œuvre : leurs couleurs et leurs signatures influencent
la composition de pétales entrelacés, de couronnes, de nervures et de pigments.
La sélection est limitée à trois ; toucher un choix actif le retire. « Autre
éclosion » produit une variation reproductible sans changer les choix.

Le mandala 2D est silencieux et statique. Le monde 3D conserve les mêmes chemins et
couleurs, déployés en relief autour d’un centre commun. Le premier regard offre une
vue en hauteur ; le voyage autonome alterne orbites et traversées. Le gyroscope
oriente seulement le regard, avec glissement tactile de secours. La musique
Gravity anime les pigments et filaments via des enveloppes spectrales lissées.
Le retour à la composition suspend la musique et conserve le mandala.

## Architecture

- `mandalaGenerator.js` : génération déterministe, symétrie partagée et projection 3D.
- `MandalaComposer.jsx` : sélection accessible, aperçu SVG texturé et variations.
- `createMandalaLandscape.js` : chemins en rubans GPU partagés, dépôts et animation locale.
- `createSensoryNetwork.js` : intégration au monde existant et gestion des ressources.
- `createSensoryAtmosphere.js` / `createSensoryCurrents.js` : nappes aquarellées,
  mots sensoriels, particules et filaments, ancrés sur la composition.
- `WatercolorWorkshop.jsx` : sélection, révélation, gyro, musique et voyage.

Le dessin est calculé uniquement lors d’un changement de sélection ou de variation.
La géométrie 3D est construite à la révélation ; l’animation utilise ensuite les
mêmes buffers et des uniformes. Les deux lots du mandala sont libérés au remplacement
et à la destruction du monde. Aucun backend, aucune analyse émotionnelle et aucune
transmission de la sélection. Les anciens modules d’édition restent dans le dépôt
mais ne constituent plus le parcours principal.

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

Vercel : commande `npm run build`, répertoire de sortie `dist`. Aucun backend ni secret nécessaire. Le MP3 Gravity existant est servi depuis `public/ambiances` ; aucun fichier n’est téléversé.

## Tests

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/watercolor-workshop.spec.js
```

Les contrôles ciblent la limite de sélection, la génération reproductible, les différences
entre combinaisons, le toucher mobile, l’aller-retour 2D / 3D, la réponse locale à
l’audio, le voyage et le nettoyage GPU. Des contrôles des anciens moteurs réutilisés
sont conservés dans cette suite. Les suites historiques des concepts abandonnés ne
font pas partie de cette validation. Le confort et le gyroscope sur téléphone
physique restent à valider. L’apparence des émojis de la palette dépend des polices
de l’appareil ; ils ne sont pas affichés dans le paysage.
