# Bibliothèque de photomontages Squibble360

Les images d'origine restent intactes : `Text1.png` et `rezo.png`.
Le dossier `emojis/` contient **12 collections de 3 placeholders** dérivés de ces
images. Ce sont des repères de composition, pas des photos thématiques originales.

| Emoji | Dossier             | Pistes pour vos futures images             |
| ----- | ------------------- | ------------------------------------------ |
| 🔥    | `emojis/feu/`       | Braises, flammes floues, cendres           |
| 🌊    | `emojis/vague/`     | Eau, vagues, reflets                       |
| ☁️    | `emojis/nuage/`     | Brume, transparences, voiles               |
| ✨    | `emojis/etincelle/` | Bokeh, poussière dorée, éclats doux        |
| 🌧️    | `emojis/pluie/`     | Gouttes, vitre humide, ruissellements      |
| 🌀    | `emojis/spirale/`   | Courants, tourbillons, spirales naturelles |
| 🌸    | `emojis/fleur/`     | Pétales, nervures, floraisons abstraites   |
| ☀️    | `emojis/soleil/`    | Lumière chaude, horizons, sable            |
| 🌙    | `emojis/lune/`      | Pierres pâles, nuit, reflets froids        |
| 🍃    | `emojis/souffle/`   | Fibres, feuillage flou, traces légères     |
| ❄️    | `emojis/cristal/`   | Givre, cristallisations, facettes          |
| 🫧    | `emojis/bulle/`     | Irisations, reflets, membranes             |

## Remplacer les images

Dans chaque dossier, remplacer directement :

1. **01-base.jpg** : photo principale, qui doit rester reconnaissable.
2. **02-matiere.jpg** : détail, texture ou motif de soutien.
3. **03-accent.jpg** : lumière, fragment ou contrepoint.

Garder ces noms suffit : aucun changement de code. Conseillé : JPEG carré de
512 à 1024 px, idéalement moins de 500 Ko. Utiliser des images dont vous disposez
des droits. Les associations sont artistiques et ne diagnostiquent aucun état.

`catalog.json` définit les chemins, les associations avec les emojis, les modes
de fusion et les opacités. Pour utiliser PNG/WebP/AVIF, modifier simplement les
chemins dans ce catalogue. Les chemins doivent rester relatifs à ce dossier.
Une image absente utilise le fichier de secours indiqué, puis les matières
procédurales si toutes les sources sont indisponibles.

## Ce que fait le moteur

À chaque sélection de 1 à 3 emojis, il prépare deux photomontages par emoji et
une matière commune : cadrages déterministes, masques diffus, mélanges doux et
petits accents colorés. Les photos principales restent lisibles. Une image
voisine participe au montage : les choix dialoguent au lieu de seulement
juxtaposer des décors. Les bulles photo et les rubans utilisent ces compositions.

Le travail Canvas s'effectue lors des choix, jamais dans la boucle 3D. Les caches
sont bornés à 16 images décodées et 4 compositions. Les chargements sont limités
à quatre simultanément ; une ancienne sélection ne remplace pas la nouvelle.

## Régénérer les placeholders

`npm run textures:placeholders` crée la bibliothèque si elle n'existe pas.
`npm run textures:placeholders -- --force` **écrase** les placeholders et le
catalogue : ne pas l'utiliser après avoir installé vos photos définitives.
Ce script utilise Chromium via Playwright ; la variable
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` permet de choisir son exécutable.

Pour le déploiement hors ligne, le build référence automatiquement les images
et le catalogue. Remplacer une image change la version du cache, même si le code
n'a pas changé. Refaire un build et redéployer, puis ouvrir l'app une fois en ligne
pour installer le nouveau cache. Aucune API d'images n'est utilisée.
