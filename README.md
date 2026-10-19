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

## Des matières animées dès le dessin

Les douze symboles possèdent des mouvements propres : flammes orange et braises
montantes sur un cœur rouge, crêtes bleues qui parcourent et épaississent la vague,
bulles ascendantes, cristaux lents, grains minéraux frémissants, plumes souples,
brumes en dérive, vibrations graphiques, spirales tournantes, fils ondulants,
pousses qui se déploient et rayons doux. Taille et opacité s’appliquent aussi aux
animations. La 2D reste sans son ; la musique et la réponse spectrale restent en 3D.

Un canvas transparent partagé anime la matière sans actualiser React à chaque
image. Les points des gestes sont rééchantillonnés et mis en cache. La cadence est
limitée à environ 30 images par seconde, la résolution à 900 pixels et les détails
à un budget adapté au nombre de tracés. Les animations 2D se suspendent en 3D et
respectent `prefers-reduced-motion`. Les rubans 3D conservent la signature de chaque
symbole via un attribut partagé et des mouvements GPU spécifiques.

## Pigments et résonance locale

Les brosses disposent de lavis et de dépôts secs détaillés, calculés une seule fois
par symbole. Une empreinte humide diffuse puis laisse un grain plus sec et des
petites auréoles capillaires. Le dessin reste présent sous ces détails vivants.

En 3D, deux textures de données partagées décrivent charge pigmentaire, dent du
papier, dépôts et couverture. Les rubans gonflent autour de leur ligne centrale :
leur amplitude et leur diffusion suivent la bande spectrale de la brosse, avec
attaque et relâchement lissés. Les transitoires renforcent brièvement les détails,
sans déplacement global ni flash. Un lot plafonné à 4 096 particules diffuse le
pigment le long des gestes : braises montantes, gouttelettes, anneaux et dérives.
Les deux lots du paysage conservent leurs buffers ; aucune texture n’est créée
pendant l’animation. Le premier cadrage tient compte du format portrait avant le
voyage immersif. La musique existante reste inchangée.

## Architecture et limites

- `EmojiPainter.jsx` : interface, capture tactile et dessin immédiat.
- `createEmojiAnimation.js` : couche Canvas 2D animée, budget de détails et cycle de vie.
- `emojiBrushMotion.js` : encres et mouvements symboliques des douze brosses.
- `createBrushPigments.js` : cache borné des empreintes aquarellées 2D.
- `pictorialShaders.js` : matière pigmentaire, gonflement local et particules 3D.
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
l’annulation, les gestes tactiles natifs, l’évolution réelle des pixels des douze
animations, la suspension en 3D et les préférences de mouvement réduit, l’aller-retour 2D / 3D, les enveloppes
audio, le voyage et le nettoyage GPU. La suite conserve aussi des contrôles des
moteurs historiques réutilisés. Les autres anciennes suites correspondent à des
concepts abandonnés. Le confort et le gyroscope sur appareil physique restent à
valider.

Le contrôle de longue durée simule six minutes de mises à jour du moteur et vérifie
la réutilisation des buffers et des textures. Il ne constitue pas une mesure de
fluidité de six minutes sur téléphone physique.
