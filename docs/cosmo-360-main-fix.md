# Correctif 360° isolé sur main

Base vérifiée : `9da2427` (PR #86). Cette version ne contient pas le précédent correctif `644f5fd`, ni les nouvelles rencontres vivantes. Cette branche applique uniquement les corrections de stabilité, sans ces ajouts artistiques.

- L'activation du gyro arrête le déplacement automatique et libère le geste tactile. Voyager reste une action explicite.
- Le cap conserve un horizon stable aux passages près de la verticale, y compris si les échantillons du capteur sautent le point vertical. Le cap suit une branche continue de l’azimut du regard ; le roulis n’intervient pas dans ce calcul.
- Les changements portrait/paysage sont recalibrés depuis le regard actuel ; les rotations sont lissées et bornées en vitesse.
- Une absence de signal au bout de quatre secondes conserve la position de contemplation et laisse le tactile disponible.
- Les membranes et rubans déformés par shader ne sont plus éliminés à partir de bornes CPU qui ignorent leur déformation.

Vérifications exécutées : build TypeScript/Vite, tests de position fixe, horizon, changement d'orientation écran, saut de cap, franchissement de la verticale et délai de quatre secondes sans signal. Un test supplémentaire émet des orientations variables pendant 35 secondes réelles : position inchangée, quaternion fini, suivi du capteur actif et absence d'erreurs JavaScript/WebGL.

Le test de 35 secondes utilise Chromium et des événements de capteur simulés. Il ne prouve pas l'absence du défaut décrit sur le téléphone réel. L'URL/version utilisée et le symptôme précis restent à confirmer. Aucun déploiement ou merge automatique dans main.

Le capteur absolu est écouté en secours sur Android. Le flux relatif est prioritaire pendant une seconde après sa dernière mesure valide. Un changement de source réinitialise la calibration depuis le regard courant : les deux origines de cap ne sont pas mélangées. Un test avec le seul événement `deviceorientationabsolute` vérifie le maintien du mode au-delà du délai initial.


## Contrôleur incrémental v3

Le correctif v2 utilisant le signe du vecteur haut présentait une régression : une rotation du téléphone autour de son axe de regard pouvait entraîner un demi-tour du cap. Le calcul utilise maintenant les variations de l'azimut du regard, déroule leur branche continue aux passages verticaux et ignore le roulis. La mesure est appliquée une seule fois à sa réception ; le rendu lit le résultat et le lisse. Le contrôle tactile et la pause suspendent la calibration jusqu'à la prochaine mesure valide.

Les interruptions supérieures à 800 ms et les discontinuités incompatibles avec l'intervalle des mesures sont recalibrées depuis le regard visible. Cela évite de poursuivre un ancien cap après une interruption ou une remise à zéro du compas. Ce filtre est une règle de confort, pas une mesure physique validée du mouvement de l'utilisateur.

Comparaison reproductible par rotations de quaternions :

| Version | Roulis seul, téléphone incliné | Passage vertical |
| --- | --- | --- |
| main `9da2427` | dérive 0° | retournement 180° |
| correctif v2 `c5fcdaf` | retournement 180° | dérive 0° |
| contrôleur v3 | dérive 0° | dérive 0° |

Les tests vérifient également qu'un tour complet reste un tour complet malgré une inclinaison et un roulis variables, et qu'une discontinuité du compas ou une interruption ne change pas brusquement le regard. Le marqueur DOM `data-gyro-controller="incremental-v3"` sur le Canvas permet d'identifier le contrôleur chargé. La confirmation sur le téléphone et le déploiement utilisés par l'utilisateur reste nécessaire.
