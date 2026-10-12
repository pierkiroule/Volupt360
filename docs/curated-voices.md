# Douze voix choisies parmi les vingt-quatre

Les pads utilisent désormais les fichiers existants de `public/voices`, sans les recopier ou les modifier. La sélection varie les durées, les respirations, l’intensité et ses variations, ainsi que le centre spectral mesuré sur les fichiers. Elle ne repose pas sur une transcription ou une écoute sémantique : le manifeste livré ne contient pas les paroles.

| Brosse       | Fragment | Fichier              |
| ------------ | -------- | -------------------- |
| Voiles       | 10       | `10_Fragment_10.mp3` |
| Falaises     | 4        | `04_Fragment_4.mp3`  |
| Corolles     | 1        | `01_Fragment_1.mp3`  |
| Filaments    | 3        | `03_Fragment_3.mp3`  |
| Encres       | 5        | `05_Fragment_5.mp3`  |
| Éclats       | 7        | `07_Fragment_7.mp3`  |
| Bulles       | 2        | `02_Fragment_2.mp3`  |
| Aurore       | 23       | `23_Fragment_23.mp3` |
| Calligraphie | 21       | `21_Fragment_21.mp3` |
| Network      | 11       | `11_Fragment_11.mp3` |
| Dilution     | 8        | `08_Fragment_8.mp3`  |
| Echo         | 24       | `24_Fragment_24.mp3` |

`src/sonoizo/voiceSelection.json` centralise les associations. Chaque voix est lue entièrement, entre environ cinq et huit secondes et demie. Les nouveaux fragments ne passent plus par la limite de cinq secondes des anciens enregistrements : la préparation des voix accepte jusqu’à quinze secondes, sans modifier cette limite pour les captures microphone et imports de samples historiques.

Les paroles n’étant pas fournies, `text` et `word` restent explicitement `null`. L’interface et les marqueurs affichent provisoirement un libellé neutre « Fragment N », qui permet de conserver la relecture au regard sans attribuer les anciens textes TTS aux nouveaux fichiers. Dès que les transcriptions sont disponibles, renseigner `text` et un `word` réellement présent dans ce texte, sans toucher à l’audio.

Le mix avec l’ambiance, les textures, les brosses et les exports sont conservés. Les douze anciens fichiers eSpeak restent dans le dépôt pour la réversibilité et ne sont plus utilisés par les pads par défaut. La génération historique des anciens textes reste indépendante de cette sélection.

Vérifications exécutées : **12 tests ciblés réussis** (sélection, lecture intégrale, voix et mots, regard gyro, ambiance, interface, textures, PNG et vidéo), build et formatage validés. Les contrôles de durée comparent chaque buffer chargé au manifeste des fichiers fournis ; Voiles est encore en lecture après cinq secondes et se termine normalement. Les tests d’export vérifient les pistes audio/vidéo et leur synchronisation. Aucune transcription des nouveaux fragments n’est déclarée vérifiée.
