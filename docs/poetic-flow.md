# Fluidité : des voix qui sculptent

Mise à jour : les mots déposés et leur relecture au regard sont retirés. Les voix, matières, ambiance musicale et exports restent actifs. Les sections sur les mots ci-dessous décrivent l’ancienne itération.

La sélection actuelle utilise les enregistrements ajoutés dans `public/voices`, décrits dans [curated-voices.md](curated-voices.md). La génération eSpeak et les textes ci-dessous documentent l’itération précédente et ne sont plus associés aux voix par défaut.

Les douze pads diffusent désormais des fragments poétiques français lus en TTS, et non des mélodies. Les douze brosses et leurs textures sont conservées. Le timbre, l’intensité et les variations de la voix sont analysés par les analyseurs Web Audio des pads ; leurs caractéristiques pilotent les matières et le vol.

Les fichiers TTS sont préparés hors application avec **eSpeak NG, voix française `fr+f3`, 140 mots/minute**, puis convertis en MP3 mono 24 kHz. La voix est synthétique, non une lecture humaine. Ils sont servis avec l’application, décodés silencieusement avec OfflineAudioContext, puis lus par Web Audio. Aucun service TTS distant, clé API, microphone ou voix native non capturable n’est nécessaire à l’exécution. La branche de capture des vidéodios reçoit donc réellement les voix. Un tap lit le fragment entier ; maintenir le pad ne le transforme pas en boucle.

Le fichier `src/sonoizo/poems.json` contient les textes et leur mot. `scripts/generate-poems.py` régénère les douze MP3 ; il nécessite `espeakng-loader` et FFmpeg seulement dans l’environnement de génération, sans dépendance ajoutée au frontend.

## Fragments

| Brosse       | Fragment                                              | Mot émergent |
| ------------ | ----------------------------------------------------- | ------------ |
| Voiles       | Je laisse le vent dénouer mes rives.                  | rives        |
| Falaises     | Même la pierre apprend la douceur des vagues.         | douceur      |
| Corolles     | Une fleur dérive au creux du souffle.                 | souffle      |
| Filaments    | Un fil d’eau recoud doucement le silence.             | silence      |
| Encres       | L’encre respire et la nuit devient rivière.           | rivière      |
| Éclats       | Une goutte éclate en mille chemins libres.            | libres       |
| Bulles       | Mes bulles emportent les couleurs du courant.         | courant      |
| Aurore       | L’aube glisse entre les plis du monde.                | aube         |
| Calligraphie | Le geste s’incline et devient passage.                | passage      |
| Network      | Nos ruisseaux se rencontrent sans perdre leur source. | source       |
| Dilution     | Je me dilue dans la lumière qui passe.                | lumière      |
| Echo         | L’écho revient comme une vague sans frontière.        | vague        |

## Mots dans l’espace et contemplation

Lorsque chaque segment de tracé est terminé, un sprite de texte noir apparaît progressivement au centre de ses positions déposées. Les pauses naturelles de la voix peuvent terminer plusieurs segments. Le sprite suit la sculpture, fait face au visiteur et s’efface avec son tracé. Sa texture et sa matière sont libérées quand le tracé disparaît ; le plafond des quatre-vingts tracés borne aussi le nombre de mots. Les PNG et les vidéos incluent ces mots dans le rendu 3D.

En contemplation gyro, le mot le plus proche du centre du regard déclenche sa lecture après **650 ms** de présence dans une zone centrale. `GazeReader` ne déclenche qu’une fois tant que ce mot reste regardé ; changer de cible ou détourner le regard permet de réarmer. Une voix en cours est respectée. La relecture utilise une voix non transmise à BrushBridge : elle **ne peint pas** et ne produit pas de nouveaux mots. Le clic sur la vue gyro prépare le contexte sonore pour les contraintes de lecture des navigateurs.

## Ambiance globale

Dans l’atelier déplié, **Ambiance MP3** charge une musique locale puis propose lecture/pause et retrait. L’audio est lu en boucle par un HTMLAudioElement relié au même mix Web Audio que les voix, à un niveau réduit. Il n’est pas envoyé aux analyseurs des brosses : la musique seule ne sculpte pas. Le mix voix + ambiance est capturé dans les vidéodios FPV.

L’import est limité à 20 Mo. Le fichier est lu comme média, sans décodage intégral en PCM en mémoire. Un remplacement invalide conserve la musique précédente. Les URLs Blob et connexions sont libérées lors du remplacement, du retrait ou de la destruction. Passer en Photo ou masquer l’onglet arrête l’ambiance ; sa reprise est explicite avec le bouton lecture.

## Réversibilité et limites

La branche est `feature/poetic-flow`. L’ancien atelier MP3 existe toujours à `/?atelier=mp3` ; la banque de samples vide utilisée pour les contrôles historiques est accessible à `/?samples=empty`. Les fichiers et le moteur de peinture n’ont pas été réécrits.

Les voix sont prédéfinies : modifier un texte exige de régénérer son MP3. Les pads peuvent encore jouer ensemble, donc des fragments simultanés peuvent se superposer. Le déclenchement du regard est vérifié avec des événements gyro simulés dans Chromium ; gyroscope matériel, qualité d’écoute sur haut-parleurs de téléphone et Safari/iOS restent à vérifier.

## Vérifications exécutées

**50 tests Chromium réussis**, puis export réel voix TTS + ambiance MP3 relancé et réussi. Les contrôles couvrent les douze fichiers audio valides et audibles, les dépôts réactifs à la voix, l’émergence des mots, le déclenchement gyro centré, l’absence de répétition en regard continu, la relecture sans dépôt, l’ambiance indépendante et le maintien de la piste précédente après un import invalide. Les exports PNG/vidéo et la synchronisation audio restent contrôlés par FFprobe/FFmpeg.

Build et formatage validés. Le build servi charge les douze lectures, sculpte et affiche « rives » et « souffle » sans erreur JavaScript ; captures portrait examinées. Les douze MP3 pèsent ensemble environ 159 Ko et chacun dure moins de cinq secondes. Les essais sur téléphone physique et Safari ne sont pas déclarés exécutés.
