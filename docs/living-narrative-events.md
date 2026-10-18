# Événements narratifs des 24 bulles

Chaque bulle prépare son événement à l’entrée en contemplation. Il démarre uniquement après « Reprendre le vol », dans le monde déjà peint. Les 24 phrases existantes sont conservées ; seul le titre de l’événement les accompagne.

## Architecture

- `narrativeEventConfig.js` associe les 24 bulles aux événements, durées et persistances.
- `createNarrativeEventManager.js` sépare préparation, démarrage, mise à jour, rétention et destruction.
- Quatre fabriques gèrent compagnons, atmosphères, branche/refuge et transformations picturales.
- `createNarrativeResources.js` partage une géométrie et une texture alpha aquarellée de 128 pixels.
- `createSoundNest.js` branche les événements sur les entrées/sorties existantes des bulles. Les shaders des pigments et le ciel reçoivent seulement des modulations locales et temporaires.

Les événements sont : spirales, ciel bavard, vieux nuage, présence silencieuse, branche, refuge, vent, trois repères, pluie suspendue, horizon caché, plume, détour, secondes élastiques, appel, mésange, chouette, vol à plusieurs, chemin partagé, nuages changeants, nouvelle ligne, chemins croisés, retour des compagnons, ciel-mémoire et vol ouvert.

## Limites et comportement

Au maximum trois événements actifs, une demande en attente, quatre empreintes durables et deux compagnons. Les sillages utilisent 96 points. Les arrivées et départs sont progressifs. Les compagnons et les nuages récurrents partagent une mémoire de position.

Le refuge ne déplace pas automatiquement l’oiseau : une proximité réelle permet une courte pause, immédiatement annulée par le toucher. Aucun événement n’impose de direction ou de caméra.

Les animations narratives continuent pendant la contemplation, mais la progression des six minutes reste suspendue. Au final, les effets transitoires disparaissent et les empreintes retenues restent dans l’œuvre. Réinitialisation et destruction libèrent les ressources. La musique Gravity, les brosses, le pilotage, le gyroscope et l’export existants sont conservés.

Le composant d’aide reste accessible indépendamment des outils et de la contemplation. Ses ressources 3114 et 112 sont explicitement situées en France. Aucun appel automatique ni collecte de données.

## Vérification

Les tests Playwright couvrent les 24 cycles de création/animation/destruction WebGL, les limites de concurrence, la préparation avant reprise, le refuge, les shaders sur de vrais pigments et l’accès à l’aide. Après destruction de chaque événement, les compteurs de géométries et textures du renderer reviennent à zéro.

La compatibilité mobile est vérifiée en émulation Chromium. Les performances sur téléphone physique, la mémoire JavaScript à long terme et une traversée humaine de six minutes restent à vérifier. Le temps accéléré des tests ne remplace pas une validation artistique sur appareil.
