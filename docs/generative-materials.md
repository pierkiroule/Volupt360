# Matières génératives : audit et intégration limitée

## Version auditée

Point de départ : `b4182bd`, branche `feat/react-vite-vercel`. React 19, Vite 7, Three.js 0.164.1 ; aucune nouvelle dépendance.

La mission décrit cinq brosses et des fonctions d’une autre version. Le dépôt contient six brosses dans `src/engine/brushes.js` : Voiles (`voiles`), Falaises (`falaises`), Corolles (`corolles`), Filaments (`filaments`), Encres (`brumes`), Éclats (`lagons`). Éclats est l’équivalent retenu pour « Splatch noir ». Pigments et Bulles ne sont pas présents sous ces noms. Les gestes ne sont pas réintroduits : les pointeurs tournent la sculpture, un tap ne peint pas, et l’appui long sur une brosse importe une image.

`createSoundNest.js` possède les tracés, leur dissolution et le cycle de vie WebGL. `createCameraRig.js` possède les interactions de scène et le gyro. `createLoopPlayer.js` et `audioGraph.js` décodent les fichiers locaux, lisent des boucles natives et mesurent RMS, énergie, centroïde spectral et flux. Le champ `freq` est un centroïde approximatif, pas une estimation de fondamentale. Le microphone, le scratch et l’export PNG sont absents.

`importBrushTexture.js` produit des masques Canvas alpha par seuil et contours. Les shaders GLSL consomment ces masques partagés par brosse. Géométries et matériaux sont détruits par tracé ; les masques importés sont détruits lors de leur remplacement ou au démontage. Les masques générés ont un propriétaire séparé.

Mobile : ratio de pixels plafonné à 1,5 ; coût des nombreux dépôts transparents, du shader fragment et des appels de dessin ; audio et gyro soumis aux règles natives du navigateur. Aucun changement de ces mécanismes.

## Architecture

- `TextureFactory.js` : pixels RGBA Canvas 2D, contours organiques diffus, accumulation au bord et granulation ; générateur pseudo-aléatoire déterministe par seed. Taille plafonnée à 256, capacité plafonnée à 16 ; l’adaptateur utilise **4 textures de 128 × 128**.
- `prepare()` : génération explicite hors rendu. Une texture en cours d’utilisation ne peut pas être évincée. Un cache saturé de références actives refuse une préparation supplémentaire. Les entrées inutilisées sont évincées selon leur dernière acquisition.
- `acquire()` : accès sans génération, avec une référence à libérer une seule fois. Éviction et fermeture appellent `Texture.dispose()` et libèrent le stockage Canvas. La fermeture refuse les références encore actives.
- `MaterialGrammar.js` : fonction pure de traduction acoustique en étalement, irrégularité, granulation et opacité. Aucune correspondance psychologique. Entrées invalides normalisées ; silence explicite ou RMS faible.
- `createGenerativeMaterials.js` : prépare quatre profils au démarrage et les sélectionne selon le son pour **Éclats seulement**. Les variations sont quantifiées ; aucune fabrication dans une frame.
- `createSoundNest.js` : raccord minimal, acquisition à la naissance d’un tracé et libération à son effacement, à la limite de ressources, au reset et au démontage. Les cinq autres brosses ne reçoivent jamais de masque généré. Les images importées restent disponibles ; pour Éclats, le masque généré a priorité lorsqu’il est activé.

Pas de changement UI, shader, bibliothèque, pipeline audio ou gestes. Les textures générées sont des masques alpha ; le shader existant garde la couleur de l’encre. Pas de variation continue de texture à chaque échantillon sonore.

## Activation et désactivation

Dans `src/engine/generativeConfig.js` :

```js
export const ENABLE_GENERATIVE_TEXTURES = false;
```

La livraison reste désactivée. Passer à `true`, puis relancer/recompiler pour essayer. Pour désactiver immédiatement : remettre `false`, recompiler et recharger. Une modification de source ne modifie pas les assets déjà déployés.

Désactivé : aucune fabrique n’est créée et les textures existantes sont utilisées. Les tests existants restent inchangés.

## Validation

Commandes : `npm run build`, `npm run format:check`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`.

Résultats exécutés : build réussi avec le drapeau désactivé et activé ; formatage réussi ; 19 tests de suite + le test MP3 supplémentaire réussis avec `false`, puis suite complète de 20 tests réussie avec `true`. Le drapeau a ensuite été restauré à `false`.

Le MP3 de test est un sinus de trois secondes généré localement avec FFmpeg ; aucun son externe ni dépendance FFmpeg pour exécuter les tests.

Les tests couvrent les six brosses actuelles, fichiers WAV et MP3, boucles et pause, caméra et gyro simulé, gestes et mise en page mobile, dissolution, imports de masques, erreurs JavaScript/WebGL, reproductibilité RGBA, éviction protégée, 1 000 acquisitions sans génération, libération et cache borné.

Les contrôles de références et de cache ne constituent pas un profilage exhaustif du heap ou du pilote GPU. Fluidité sur téléphone physique et gyro réel restent à vérifier. Microphone, scratch avant/arrière, tap-splatch et export PNG ne sont pas testés : fonctions absentes du point de départ. Aucune restauration de ces fonctions dans cette PR.

La PR cible la branche applicative `feat/react-vite-vercel` pour isoler ce changement : `main` ne contient encore que l’initialisation du dépôt. Aucune fusion automatique.
