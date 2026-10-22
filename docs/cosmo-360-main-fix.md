# Correctif 360° isolé sur main

Base vérifiée : `9da2427` (PR #86). Cette version ne contient pas le précédent correctif `644f5fd`, ni les nouvelles rencontres vivantes. Cette branche applique uniquement les corrections de stabilité, sans ces ajouts artistiques.

- L'activation du gyro arrête le déplacement automatique et libère le geste tactile. Voyager reste une action explicite.
- Le cap conserve un horizon stable aux passages près de la verticale, y compris si les échantillons du capteur sautent le point vertical. Le vecteur haut corrige l'inversion de la projection horizontale.
- Les changements portrait/paysage sont recalibrés depuis le regard actuel ; les rotations sont lissées et bornées en vitesse.
- Une absence de signal au bout de quatre secondes conserve la position de contemplation et laisse le tactile disponible.
- Les membranes et rubans déformés par shader ne sont plus éliminés à partir de bornes CPU qui ignorent leur déformation.

Vérifications exécutées : build TypeScript/Vite, tests de position fixe, horizon, changement d'orientation écran, saut de cap, franchissement de la verticale et délai de quatre secondes sans signal. Un test supplémentaire émet des orientations variables pendant 35 secondes réelles : position inchangée, quaternion fini, suivi du capteur actif et absence d'erreurs JavaScript/WebGL.

Le test de 35 secondes utilise Chromium et des événements de capteur simulés. Il ne prouve pas l'absence du défaut décrit sur le téléphone réel. L'URL/version utilisée et le symptôme précis restent à confirmer. Aucun déploiement ou merge automatique dans main.

Le capteur absolu est écouté en secours sur Android. Le flux relatif est prioritaire pendant une seconde après sa dernière mesure valide. Un changement de source réinitialise la calibration depuis le regard courant : les deux origines de cap ne sont pas mélangées. Un test avec le seul événement `deviceorientationabsolute` vérifie le maintien du mode au-delà du délai initial.
