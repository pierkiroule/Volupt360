# LandscapeComposer — paysages procéduraux

## État de la validation Poly Haven

**L’API réelle n’a pas pu être inspectée depuis cet environnement.** Le 21 octobre 2026, `curl https://api.polyhaven.com/assets?type=models` a échoué avec `CONNECT tunnel failed, response 403`, y compris après une tentative avec accès élargi. Aucun téléchargement ni chargement de modèle Poly Haven réel n’est donc déclaré validé.

Le paysage procédural fonctionne indépendamment du service. L’adaptateur réseau reste à confirmer sur des réponses et fichiers réels avant de considérer l’intégration Poly Haven comme validée. Un test synthétique vérifie uniquement un glTF avec buffer externe déclaré, pas un asset Poly Haven authentique. Les parsers n’utilisent aucun chemin supposé de résolution (`gltf/1k/...`) : ils inspectent les URL réellement présentes dans les réponses. Un schéma inconnu, une compression non prise en charge ou une dépendance non déclarée fait conserver les objets locaux.

## Architecture

- `LandscapeComposer.ts` : composition reproductible, point de vue et orchestration.
- `TerrainGenerator.ts` : bruit fractal à quatre octaves, déformation du domaine, relief continu, rivière, altitude, pente, normale et vallées.
- `BiomeComposer.ts` : règles forêt, montagne, désert, littoral et monde onirique.
- `SceneComposer.ts` : bosquets, affleurements, végétation de vallée, sommets dégagés, corridor de vue et index spatial pour limiter les recouvrements.
- `AssetLibrary.ts` : catalogue `/assets?type=models`, métadonnées `/info/{id}`, manifestes `/files/{id}`, validation des URL, fichiers glTF/GLB, dépendances glTF déclarées, cache et destruction des ressources. L’environnement HDRI optionnel utilise un catalogue séparé et des URL `.hdr` retournées par le service.
- `AtmosphereEngine.ts` : quatre palettes d’aube, jour, crépuscule et nuit.
- `LandscapeScene.tsx` / `SurfaceMaterials.ts` : matériaux PBR mats avec grain local, ciel, brouillard, eau, ombres douces et lumière environnementale PMREM. En l’absence de HDRI téléchargé, un environnement d’éclairage procédural est utilisé ; ce secours n’est pas une photographie HDRI.
- `landscape.worker.ts` : génération des données hors du thread principal. Un secours limité reste disponible si les Workers ne fonctionnent pas.
- `LandscapeApp.tsx` : quatre réglages, génération, contemplation orbitale, exploration tactile/gyro avec horizon stabilisé et sauvegarde locale.

Le nouveau parcours est l’accueil par défaut. L’expérience aquarellée précédente reste accessible à `?meteo`, l’atelier à `?studio`, le colibri à `?colibri`. Les clés de sauvegarde existantes ne sont pas modifiées.

## Ressources et composition

Une génération place au maximum 355 objets dans un rayon de 46 unités. Les géométries locales sont partagées et instanciées. Les arbres et les rochers passent à une géométrie simplifiée à distance ; les végétaux lointains sont retirés. La grille de relief comporte 112² cellules sur petit écran et 160² sur grand écran. Le pixel ratio est limité à 1,4. Les ombres sont recalculées à la composition et à l’arrivée d’un modèle, pas en permanence.

Un seul modèle distant distinct est chargé progressivement, cloné au maximum trois fois sur des emplacements compatibles ; tous les autres éléments utilisent la bibliothèque procédurale. Les assets exigeant des décodeurs Draco/Meshopt/KTX supplémentaires ne sont pas supposés disponibles. Un échec n’interrompt jamais le paysage local.

Budgets : 18 Mio de téléchargement cumulé par modèle, 120 000 sommets, huit sous-meshes et 24 Mio estimés de textures décodées. Le cache de fichiers contient au maximum six entrées et 32 Mio. Les HDRI sont limités à 4 Mio téléchargés et 1024 × 512 pixels décodés. Les objets distants ne sont jamais placés à partir d’une URL fabriquée ; seuls les domaines HTTPS Poly Haven déclarés dans les manifestes sont autorisés.

Les métadonnées ne sont pas traitées comme des instructions. Les crédits des ressources réellement chargées renvoient à leurs pages Poly Haven (CC0). Les fichiers glTF ont leurs URI externes remplacées par des Blob URL provenant des dépendances déclarées, puis libérées après décodage.

## Sauvegarde et navigation

« Enregistrer » conserve les paramètres, la graine et les identifiants des ressources actuellement présentes dans `landscape-composer.saved.v1`. Une composition sauvegardée avec des ressources locales reste locale à la restauration. Les placements et reliefs locaux sont déterministes. La disponibilité et l’évolution des fichiers externes ne peuvent pas être garanties ; ils sont remplacés par les éléments locaux si nécessaire.

La sauvegarde n’est pas un export GLB ou PNG. Aucun backend, authentification ou télémétrie. Le voyage est lent et reste dans une zone bornée ; le terrain garantit une marge sous la caméra. Le gyroscope est optionnel et le glissement fonctionne en secours.

## Vérification

- `npm run build`
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/landscape-composer.spec.js tests/weather.spec.js`

Les tests couvrent reproductibilité, cinq biomes, quatre atmosphères, budgets locaux, pentes et regroupements, génération par Worker, réseau distant coupé, navigation/pause, régénération, sauvegarde/reprise et glTF synthétique avec dépendance externe et nettoyage. Les tests météo vérifient les fonctions préservées. Ils ne valident pas le téléchargement d’un modèle réel, un HDRI Poly Haven réel, ni la performance prolongée d’un smartphone. Ces points restent à vérifier.

Pour revenir à la météo comme accueil, remplacer le dernier `LandscapeApp` par `WeatherApp` dans `src/main.jsx`.

### Résultats exécutés

Build TypeScript/Vite réussi. Les cinq tests du compositeur et les neuf tests météo ont été exécutés avec succès. Un test supplémentaire sur le build de production confirme la restauration et le lancement du Worker avec le navigateur hors ligne. Le passage d’une vue orbitale à l’exploration conserve le cadrage choisi. Aucune mesure de FPS sur téléphone physique et aucun téléchargement Poly Haven réel ne sont déclarés réussis.
