# Photos et vidéodios de L’Oizodio•°

La troisième vue, **Photo**, arrête le vol, les dépôts, l’évolution des matières et les sons joués. Glisser permet de tourner la sculpture sur les axes horizontal et vertical ; pincement, molette ou boutons +/− règlent le zoom. Quitter cette vue reprend le vol sans effacer la sculpture.

**Télécharger la photo · PNG HD** réalise un nouveau rendu du cadrage choisi, avec l’étalonnage existant et sans interface, jusqu’à **2 560 pixels sur le grand côté**, dans les proportions de l’écran. La résolution est limitée aux capacités du GPU si celui-ci ne supporte pas cette taille. Le rendu normal est restauré avant l’encodage PNG. Un lien permet de télécharger à nouveau la photo.

**Créer ma vidéodio** encode localement une vidéo de dix secondes contenant **uniquement le vol FPV drone enregistré**, avec son audio. Elle conserve les dix dernières secondes disponibles, donc aussi les six dernières secondes demandées initialement. Si le voyage est plus court, cette séquence et son audio bouclent ensemble jusqu’à dix secondes. Aucun plan figé ni image de contemplation gyro n’est ajouté. Le cadrage Photo sert au PNG ; il ne recadre pas rétroactivement le vol FPV.

Passer en gyro ou en Photo conserve la dernière prise FPV sans y ajouter de nouvelles images ou de nouveaux sons. Revenir en drone commence une nouvelle prise. En l’absence de prise FPV, l’export indique qu’il faut d’abord jouer dans cette vue.

Après création, **Télécharger ma vidéodio** conserve un fichier dans les téléchargements du visiteur. Aucun upload, backend ni collection persistante dans l’application : les fichiers téléchargés constituent la collection.

## Architecture et ressources

- `createVideodio.js` conserve un anneau de JPEG, au maximum douze captures par seconde et 640 pixels sur le grand côté, plus dix secondes de PCM mono. Une seule compression est en cours à la fois. Les anciennes captures sont retirées à mesure que le temps avance. L’export décode une seule image à la fois.
- `CaptureProcessor.js` est un AudioWorklet natif qui prélève le mix des pads après leur gain commun, sur une branche muette, sans ajouter de son ni demander de microphone. Chaque paquet PCM porte sa position exacte dans l’horloge audio. `getOutputTimestamp()` convertit cette position vers l’horloge des images pour tenir compte de la sortie audio. Les navigateurs sans AudioWorklet utilisent un ScriptProcessor avec une précision temporelle moindre.
- À l’export, le même AudioContext pilote le buffer sonore et la sélection des images. Le son et l’image bouclent sur la même durée historique. La voix a un arrêt programmé ; une borne de temps réel empêche un export de se prolonger sous charge.
- `createSoundNest.js` suspend la simulation en Photo tout en conservant le rendu et la caméra. L’export PNG augmente temporairement la résolution du renderer et du post-traitement, copie le rendu dans un canvas 2D, puis restaure les dimensions, le pixel ratio et la projection.
- `createCameraRig.js` ajoute la rotation verticale, le pincement et la molette en Photo. Les modes drone et gyro conservent leurs interactions.
- Les pistes MediaStream, les bitmaps décodés et l’AudioContext d’export sont libérés après l’encodage. Les liens Blob précédents sont révoqués lorsqu’ils sont remplacés ou lorsque l’application est détruite. Le tap audio est libéré avec la banque.

Le navigateur choisit WebM/VP8/Opus ou MP4 selon ses encodeurs disponibles. Un navigateur sans encodeur affiche une erreur ; le PNG et le cadrage restent utilisables. Garder l’onglet visible pendant la création vidéo, qui dure environ dix secondes réelles. La vidéo conserve les proportions du canvas, avec une résolution limitée à 640 pixels pour réduire le coût mobile. Un changement d’orientation pendant le voyage peut étirer les anciennes images au format final.

Les contrôles Chromium et WebGL logiciel ne constituent pas une mesure de fluidité sur téléphone physique. Safari/iOS matériel et le fallback ScriptProcessor restent à vérifier.

## Textures prédéfinies

Le sélecteur de fichiers image est retiré de l’atelier principal et de l’atelier MP3. Cinq masques organiques RGBA de 256 × 256 pixels sont proposés : **Mycélium, Cellules, Nervures, Encre éclatée et Écailles**. Chacun contient des régions opaques et des régions entièrement transparentes, avec des contours contrastés et des déformations périodiques pour la répétition.

Les cinq canvases et leurs aperçus sont mis en cache, hors boucle de rendu. Chaque brosse conserve sa propre texture Three.js ; le remplacement libère l’ancienne texture. Les masques remplacent ceux des traces existantes et futures sans modifier le moteur des douze brosses. L’ancien utilitaire de traitement d’images n’est plus connecté à l’interface.

## Vérifications

`tests/videodio.spec.js` réalise de vrais téléchargements PNG et vidéo. FFprobe contrôle le format PNG, la résolution HD, les proportions, les pistes audio/vidéo et la durée. FFmpeg décode le contenu visuel et sonore ; un scénario de couleurs et d’impulsions PCM connues vérifie une différence de moins de 150 ms entre leurs transitions dans le fichier exporté. Les contrôles couvrent le gel et la reprise de la sculpture, le pincement, le zoom, le maintien de la prise FPV en gyro et l’anneau borné.

`tests/preset-textures.spec.js` vérifie cinq masques distincts, leurs régions opaques et transparentes, leur application à une brosse et l’absence d’input image sur mobile. Les tests historiques sont adaptés au choix des textures prédéfinies au lieu de l’import d’images.

Résultats exécutés pour cette version : **46 tests réussis sous Chromium**. Les téléchargements natifs PNG et vidéo, la résolution 2 560 pixels, la présence d’audio pendant toute la prise rejouée, le maintien exclusif du FPV et la synchronisation des transitions à moins de 150 ms sont vérifiés. Build et formatage validés. Le build servi a été testé séparément : un AudioWorklet est créé et aucun ScriptProcessor de fallback n’est utilisé. L’interface des cinq aperçus a été examinée en portrait mobile ; des images extraites de la vidéo et du PNG ont été examinées. Téléphone physique et Safari non testés.
