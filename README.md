# Ciel en résonance •° — Des émojis pour peindre

**Choisir une brosse émoji → dessiner librement → révéler son paysage 3D.**

Douze brosses traduisent les symboles en matières : la vague produit des rubans bleus
ondulants, le feu des langues chaudes, la plume des nervures, le flocon des cristaux,
la pierre des granulations, la brume des lavis, la vibration des lignes brisées,
le tourbillon des spirales, le fil des fibres, la pousse des ramifications,
le soleil des rayons et les bulles de petits anneaux. Les émojis servent à choisir
la brosse, ils ne sont pas tamponnés dans le dessin.

Le toucher ou la souris dépose immédiatement la matière sur un disque blanc cassé.
Taille, opacité, annulation et effacement sont disponibles. La 2D est silencieuse.
La révélation reprend les mêmes géométries et couleurs dans un paysage 3D enveloppant.
Gravity et les enveloppes spectrales lissées font vivre les rubans, nuages et
particules. Le voyage autonome reste borné autour de l’œuvre ; gyro et glissement
orientent le regard. Revenir au dessin conserve les tracés et suspend la musique.

## Architecture et limites

- `EmojiPainter.jsx` : interface, capture tactile et dessin immédiat.
- `emojiPainting.js` : douze signatures procédurales ; géométrie commune aux deux vues.
- `createPictorialLandscape.js` : rubans et pigments GPU, projection et audio local.
- `createSensoryNetwork.js` : intégration avec nappes, mots sensoriels et particules.
- `WatercolorWorkshop.jsx` : parcours dessin / contemplation, musique et navigation.

La session conserve au maximum 80 tracés. Chaque geste conserve jusqu’à 256 points
avant simplification progressive et rééchantillonnage borné (1 024 points de travail).
Les tracés terminés sont mis en cache par référence ; les textures ne sont pas
régénérées par frame. La géométrie 3D est créée à la révélation, réutilisée pendant
l’animation et libérée au remplacement ou à la destruction. Les sélections n’ont
aucune interprétation clinique. Aucun backend ni transmission des dessins.
Les modules du mandala ont été retirés du parcours et du dépôt.

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

Les contrôles ciblent les douze signatures, la continuité du tracé, l’opacité,
l’annulation, les gestes tactiles natifs, l’aller-retour 2D / 3D, les enveloppes
audio, le voyage et le nettoyage GPU. La suite conserve aussi des contrôles des
moteurs historiques réutilisés. Les autres anciennes suites correspondent à des
concepts abandonnés. Le confort et le gyroscope sur appareil physique restent à
valider.
