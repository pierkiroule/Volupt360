# Matières picturales vivantes

## Palette et fond

Le parcours principal présente huit matières abstraites : Lavis, Brosse sèche, Encre fine, Taches, Éclaboussures, Calligraphie, Diffusion et Tampons. `landscapePalette` définit leurs couleurs, épaisseurs et textures. Les familles existantes sont réutilisées ; Tampons utilise les dépôts plans des taches avec une matière colorée, sans silhouette végétale. Le masque sec ajoute des réserves anisotropes et un grain de papier. Les shaders ajoutent le détail fin et la diffusion.

Le fond est le papier uniforme `#f4f0e8`. Le skydome crépusculaire n’est plus instancié ni chargé par ce moteur. Les surprises décoratives ne sont plus appliquées aux dépôts. Le générateur de brosses reste absent de l’interface.

## Évolution de la matière

`createPictorialFlow` anime les dépôts terminés avec un champ lent et déterministe d’attracteurs mouvants. Une vitesse amortie conduit vers une cible bornée, dont l’amplitude varie avec les basses et l’énergie du MP3. La dérive est limitée à 3,5 unités ; une faible rotation apparaît progressivement autour du centre propre du dépôt. Les déformations locales se font dans le vertex shader. La géométrie et les masques ne sont pas reconstruits pendant l’animation.

Les gestes en cours restent attachés au sillage. Les bornes de chaque dépôt suivent sa transformation, pour conserver un cadrage cohérent. Les états sont stockés dans une WeakMap : ils deviennent récupérables avec les traces supprimées. La dissolution continue pendant la contemplation, avec un plafond de 56 traces sur mobile et 80 sur ordinateur. Le mode Photo fige les forces, les matières et la dissolution.

Le parcours fixe ne prépare plus les 24 textures historiques inutilisées : elles ne sont créées que si une ancienne brosse sans masque en a besoin. Les masques actifs sont préparés une seule fois, à 128 pixels sur mobile et 256 sur ordinateur, puis partagés. Le budget adaptatif de pixels est conservé.

## Musique locale

Le visiteur importe un MP3 (20 Mo maximum). Aucun fond audio n’est chargé automatiquement, aucun son n’est synthétisé. Le lecteur Web Audio existant conserve son analyse, sa capture et ses pauses. Une nouvelle importation remplace la musique, sans effacer l’œuvre. Les fichiers et leurs URL restent locaux ; l’ancien lecteur et son URL sont libérés au remplacement.

La pause manuelle est respectée en changeant de vue. La pause temporaire de cadrage reprend à la sortie du mode Photo, y compris pour un MP3 importé. La commande d’import reste disponible en FPV et gyro.

## Regard et photographie

La FPV conserve sa distance par défaut de trois unités et le pilotage doux. À l’entrée en gyro, le regard s’oriente vers le centre de la matière existante, avec son élévation, avant de laisser le visiteur explorer. Il ne suit pas ensuite automatiquement les déplacements des dépôts.

« Photographier la vue actuelle » utilise l’export PNG existant, jusqu’à 2560 pixels sur le grand côté. Il capture le regard courant sans changer de mode ni couper la musique ; aucune interface n’est incluse. Le mode de cadrage Photo et la vidéodio sont conservés.

## Contrôles et limites

Les tests ciblés couvrent le MP3 effectivement importé, son énergie mesurée, ses pauses/reprises, les huit matières avec leurs masques, la réponse graphique à la musique, la dérive bornée et continue à 30/60 Hz simulés, la pause des forces, les réserves des textures, le PNG HD téléchargé depuis le gyro, la caméra et le budget mobile. Les références au coucher de soleil restantes sont des modules historiques et des tests unitaires isolés, sans effet sur le parcours actif.

Le champ est une simulation artistique légère, sans collisions entre fluides ni simulation physique de pigments. L’écoute et la cadence sur téléphone physique, les permissions des capteurs et tous les codecs vidéo restent à vérifier. Les tests de navigateur utilisent Chromium avec rendu WebGL logiciel.
