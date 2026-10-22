# Mon CosmoSensoriel •°

L’accueil ouvre un disque de composition sensorielle : 16 émojis, des zones à déposer, une proportion et une opacité à ajuster. Ces choix font émerger un cosmos aquarellé de voiles, de courants pigmentaires, de quelques particules et de filaments courbes. Exploration tactile ou gyro, sauvegarde locale conservée, sans interprétation psychologique.

Le cosmos utilise deux membranes de tissu aquarellé souple, des contours filaires et un rendu mobile borné. **L’API Poly Haven et ses chargements ont été supprimés** : toutes les matières sont procédurales. Le compositeur local de paysages est conservé avec **`?paysage`**. Voir [le rendu léger et ses limites](docs/filament-cosmos.md).

[Architecture, palette, performance et limites](docs/mon-cosmosensoriel.md).

---

# Paysages •° — LandscapeComposer

Un compositeur de paysages 3D : cinq biomes, quatre atmosphères, relief et densité réglables, génération par graine, exploration 360° et sauvegarde locale. La bibliothèque procédurale fonctionne lorsque les ressources distantes sont indisponibles.

Le chargement externe de modèles et de HDRI a été retiré. Les cinq biomes emploient les objets procéduraux locaux. Les documents plus anciens décrivent aussi l’ancienne intégration réseau.

Les expériences existantes sont conservées sous `?meteo`, `?studio` et `?colibri`.


---

# Ma météo émotionnelle •°

Pose des émojis météo sur un disque aquarellé animé, ajuste la proportion et l’opacité de chaque zone, puis entre dans le même ciel en 3D pour le contempler ou y voyager. Un outil de composition libre, sans interprétation automatique.

Cette ancienne étape météo est remplacée à l’accueil par Mon CosmoSensoriel. Les expériences précédentes restent accessibles : **`?colibri`**, **`?studio`**. L’enregistrement du ciel est local et volontaire. Voir [l’architecture et le fonctionnement](docs/emotional-weather.md).

---

# Squibble le colibris •°

Un imaginaire à butiner : choisis un à trois émojis, fais éclore un monde aquarellé puis traverse ses bulles pour découvrir récits, images et invitations métaphoriques. Un carnet local conserve uniquement les ressources choisies.

Le nouveau parcours est l’accueil par défaut. L’atelier de création ci-dessous reste accessible à **`?studio`**, avec ses projets préservés. Voir [l’architecture Squibble](docs/squibble-colibri.md).

---

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

Le moteur Strudel et ses commandes ont été retirés. Le cosmos fonctionne désormais sans musique générative.
