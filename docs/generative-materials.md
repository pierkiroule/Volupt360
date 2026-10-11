# Matières génératives : audit et intégration limitée

## Version auditée

Point de départ : `b4182bd`, branche `feat/react-vite-vercel`. React 19, Vite 7, Three.js 0.164.1 ; aucune nouvelle dépendance.

La mission décrit cinq brosses et des fonctions d’une autre version. Le dépôt contient six brosses dans `src/engine/brushes.js` : Voiles (`voiles`), Falaises (`falaises`), Corolles (`corolles`), Filaments (`filaments`), Encres (`brumes`), Éclats (`lagons`). Éclats était la cible de l’intégration initiale, équivalent de « Splatch noir ». La nouvelle demande étend les matières générées aux six brosses. Pigments et Bulles ne sont pas présents sous ces noms. Les gestes ne sont pas réintroduits : les pointeurs tournent la sculpture, un tap ne peint pas, et l’appui long sur une brosse importe une image.

`createSoundNest.js` possède les tracés, leur dissolution et le cycle de vie WebGL. `createCameraRig.js` possède les interactions de scène et le gyro. `createLoopPlayer.js` et `audioGraph.js` décodent les fichiers locaux, lisent des boucles natives et mesurent RMS, énergie, centroïde spectral et flux. Le champ `freq` est un centroïde approximatif, pas une estimation de fondamentale. Le microphone, le scratch et l’export PNG sont absents.

`importBrushTexture.js` produit des masques Canvas alpha par seuil et contours. Les shaders GLSL consomment ces masques partagés par brosse. Géométries et matériaux sont détruits par tracé ; les masques importés sont détruits lors de leur remplacement ou au démontage. Les masques générés ont un propriétaire séparé.

Mobile : ratio de pixels plafonné à 1,5 ; coût des nombreux dépôts transparents, du shader fragment et des appels de dessin ; audio et gyro soumis aux règles natives du navigateur. Aucun changement de ces mécanismes.

## Architecture

- `TextureFactory.js` : pixels RGBA Canvas 2D, contours organiques diffus, accumulation au bord et granulation ; générateur pseudo-aléatoire déterministe par seed. Taille plafonnée à 256, capacité plafonnée à 24 ; l’adaptateur utilise **24 textures de 128 × 128**, deux par brosse.
- `prepare()` : génération explicite hors rendu. Une texture en cours d’utilisation ne peut pas être évincée. Un cache saturé de références actives refuse une préparation supplémentaire. Les entrées inutilisées sont évincées selon leur dernière acquisition.
- `acquire()` : accès sans génération, avec une référence à libérer une seule fois. Éviction et fermeture appellent `Texture.dispose()` et libèrent le stockage Canvas. La fermeture refuse les références encore actives.
- `MaterialGrammar.js` : fonction pure de traduction acoustique en étalement, irrégularité, granulation et opacité. Aucune correspondance psychologique. Entrées invalides normalisées ; silence explicite ou RMS faible.
- `createGenerativeMaterials.js` : prépare deux variantes par brosse au démarrage et les sélectionne selon le son pour les **douze brosses**. Les variations sont quantifiées ; aucune fabrication dans une frame.
- `createSoundNest.js` : raccord minimal, acquisition à la naissance d’un tracé et libération à son effacement, à la limite de ressources, au reset et au démontage. Les images importées ont priorité sur les masques générés, pour les traces existantes et futures. Le remplacement libère les références générées sans détruire les textures encore partagées.

Pas de changement UI, bibliothèque, pipeline audio ou gestes. Le shader permet désormais un masque unique pour chaque dépôt généré ; les images importées gardent leur répétition précédente. Les textures générées sont des masques alpha ; le shader existant garde la couleur de l’encre. Pas de variation continue de texture à chaque échantillon sonore. Les lavis, strates, nervures, filaments, taches et éclaboussures ont des motifs alpha distincts.

## Surprises graphiques

`graphicSurprises.js` réserve un tracé éligible sur neuf aux accents audibles, avec alternance déterministe de trois motifs : halo ambré, constellation et dentelle. Intensité faible et silence ne déclenchent rien. Le shader localise le motif dans une petite partie du tracé, sans nouveau mesh ni texture. Les masques personnels restent appliqués en dernier pour préserver leurs découpes. Ces motifs ne sont pas des flashes ou des réactions psychologiques.

## Activation et désactivation

Dans `src/engine/generativeConfig.js` :

```js
export const ENABLE_GENERATIVE_TEXTURES = true;
```

La génération est désormais activée pour les six brosses. Importer un morceau et choisir une brosse. Pour désactiver immédiatement : remettre `false`, recompiler et recharger. Une modification de source ne modifie pas les assets déjà déployés.

Désactivé : aucune fabrique n’est créée et les textures existantes sont utilisées. Les tests existants restent inchangés.

## Validation

Commandes : `npm run build`, `npm run format:check`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`.

Résultats exécutés : build réussi avec le drapeau désactivé et activé ; formatage réussi ; 19 tests de suite + le test MP3 supplémentaire réussis avec `false`, puis suite complète de 20 tests réussie avec `true`. Ce sont les résultats de la livraison initiale. Après activation et correction du masque unique : build et formatage réussis, 20 tests de suite réussis et un test WebGL supplémentaire réussi, comparant les pixels avec/sans masque tout en vérifiant la présence d’encre visible.

Le MP3 de test est un sinus de trois secondes généré localement avec FFmpeg ; aucun son externe ni dépendance FFmpeg pour exécuter les tests.

Les tests couvrent les douze brosses actuelles, fichiers WAV et MP3, boucles et pause, caméra et gyro simulé, gestes et mise en page mobile, dissolution, imports de masques, erreurs JavaScript/WebGL, reproductibilité RGBA, éviction protégée, 1 000 acquisitions sans génération, libération et cache borné.

Les contrôles de références et de cache ne constituent pas un profilage exhaustif du heap ou du pilote GPU. Fluidité sur téléphone physique et gyro réel restent à vérifier. Microphone, scratch avant/arrière, tap-splatch et export PNG ne sont pas testés : fonctions absentes du point de départ. Aucune restauration de ces fonctions dans cette PR.

L’intégration initiale a été fusionnée par la PR #4 dans `feat/react-vite-vercel`. La consolidation synchronise cette branche avec `main`, qui contient les évolutions applicatives de la PR #3. Les changements restants vers `main` concernent les matières génératives et leur documentation. Aucune fusion automatique dans `main`.

Validation de l’extension aux six brosses : build et formatage réussis ; suite de 23 tests réussie, dont distinction des six masques, priorité des images importées et références libérées. Les surprises sont vérifiées pour leur rareté, leur diversité et leur absence en silence.

Extension de la palette : Bulles (sphères à centre transparent et reflets multicolores), Aurore (trois voiles torsadés irisés), Calligraphie (arabesques à pleins et déliés). Chaque nouvelle brosse dispose de deux masques dédiés, accepte les images importées et suit le cycle de dissolution existant. Les bulles sont espacées à deux sphères tous les six échantillons de déplacement pour limiter les dépôts ; la palette mobile affiche deux rangées.

Validation de la palette à neuf brosses : compilation et formatage réussis ; 26 tests Playwright réussis sous Chromium avec WebGL logiciel. Vérifications supplémentaires : géométries distinctes, pigments visibles et multicolores, neuf masques différents, imports sur les neuf brosses et cache limité à dix-huit textures. La fluidité et les capteurs sur téléphone physique restent à vérifier.

Network regroupe ses liens et nœuds dans une seule géométrie bornée par tracé ; Dilution utilise deux rubans diffus et Echo trois rubans avec retards de quatre et huit échantillons. Les trois acceptent les masques importés. Le cache reste plafonné à vingt-quatre textures préparées au démarrage. Persistance : 200 secondes de base et 48 secondes de dissolution, modulées par densité et importance, avec plafond inchangé de 80 tracés.

Validation de la palette à douze brosses : build et formatage réussis ; 26 tests Playwright réussis sous Chromium avec WebGL logiciel. Tests étendus aux douze imports et à la lecture audio sur toutes les brosses, aux vingt-quatre textures, à la persistance prolongée et à l’effacement irréversible. Rendu GPU : six nouvelles brosses visibles, séparation spatiale des échos, géométrie Network bornée, disparition complète à fade nul et géométries GPU libérées après destruction. Fluidité sur téléphone physique encore à vérifier.
