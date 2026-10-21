# SQUIGGLE 360 •°

**L’atelier des dessins vivants — Dessiner. Animer. Habiter.**

Un studio React/Vite/TypeScript local : douze matières graphiques, brosses hybrides, douze animations peintes localement, puis une transformation continue du tableau en sculpture et en immersion 360°. Aucun compte, backend, service IA ou interprétation du dessin.

## Utilisation

- **Dessiner** : doigt, souris ou stylet, six favorites, palette étendue, couleur, taille, opacité et gomme partielle.
- **Animer** : peindre un comportement local, régler sa force, le désactiver ou le retirer. L’original reste intact.
- **Contempler** : tableau, curseur de profondeur, sculpture orbitale et immersion tactile/gyroscope. Pause et sortie restent accessibles.
- Projets enregistrés dans IndexedDB sur l’appareil, historique undo/redo, sauvegarde JSON portable, PNG et WebM 2D de huit secondes quand disponible. Le son procédural est facultatif.

## Développement

Node 22.12+ ou version compatible du projet.

```sh
npm ci
npm run dev
npm run typecheck
npm run build
npm run test:studio
```

Playwright utilise son Chromium installé, ou le binaire défini par `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

Pour vérifier le fonctionnement hors ligne, lancer le build en preview puis, dans un autre terminal :

```sh
npm run preview -- --port 4176
STUDIO_PROD_URL=http://127.0.0.1:4176 npm run test:studio:offline
```

Vercel conserve la configuration existante (`dist`, framework Vite). Après chargement du build, le service worker permet l’ouverture hors ligne ; les projets restent dans IndexedDB. Un export JSON est conseillé pour conserver une copie indépendante du navigateur.

## Architecture, validation et limites

Voir [la documentation du studio](docs/squiggle-studio.md). Les matières sont procédurales ; la transduction associe calques pigmentaires et géométries spécifiques, sans simulation physique complète des fluides. Le WebM ne contient pas de piste sonore. La fluidité sur un appareil réel, notamment le Galaxy S24 Ultra, reste à mesurer.

L’ancienne expérience est conservée sous `?squibble` et les autres routes historiques restent accessibles. Leurs fichiers publics et leurs stockages ne sont pas supprimés. [Documentation historique](docs/README-history.md).
