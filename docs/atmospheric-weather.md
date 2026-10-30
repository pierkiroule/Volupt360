# Météo projective — atmosphère 3D

Le parcours reste : choisir un à trois émojis, voir naître sa météo, entrer,
contempler ou voyager. Les correspondances sont artistiques, pas des mesures
psychologiques ni des prévisions météo géolocalisées.

## Moteur

- `WeatherClimate.ts` : douze climats composables et graine ordonnée reproductible.
  Couverture, averses, neige, vent, brume, nuit et hauteur du soleil coexistent.
  Soleil + pluie peut laisser découvrir un arc-en-ciel dans la direction opposée
  au soleil. Le premier choix infléchit le mélange, sans écraser les suivants.
- `CloudAtlas.ts` : quatre densités nuageuses et éclairages de relief procéduraux,
  calculés une fois sur un canvas 256² réutilisé. Aucune image distante.
- `WeatherAtmosphere.ts` : skydome continu, champ de nuages 3D et précipitations.
  Les nuages sont des amas d’imposteurs éclairés, triés de l’arrière vers l’avant
  selon le regard. Ce n’est pas un ray marcher volumétrique ni une simulation
  physique de fluides ou de transfert radiatif.

Les 112 éléments mobiles / 176 éléments ordinateur se regroupent en formations
à différentes hauteurs, dont des nappes basses vues depuis le ciel. Les éléments
dérivent et se déforment doucement à des rythmes déphasés. La caméra produit une
vraie parallaxe ; les volumes approchés s’effacent progressivement plutôt que
d’être découpés au passage du plan proche.

La densité autour de la caméra est calculée dans des enveloppes 3D mouvantes.
Elle donne une brume locale lissée à l’entrée d’un nuage, puis se dissipe à la
sortie. Le skydome suit la translation de la caméra, en gardant son orientation
mondiale : horizon stable, soleil directionnel, lumière diffuse et étoiles
nocturnes discrètes. Pas de sol artificiel ni de pulsation lumineuse.

La pluie et la neige occupent deux zones spatiales, avec une dérive selon le
vent, un adoucissement des limites et une atténuation en profondeur. Pas de
flash d’éclair ou de son explosif. Les silhouettes restent naturelles et
ambiguës ; aucune figure cachée ou interprétation automatique n’est imposée.

## Intégration et budget

Le moteur Three.js, les commandes tactiles, le gyro avec permission et fallback,
le parcours borné, pause/reprise et la musique existante sont conservés. Les
profils musicaux suivent toujours les choix. Les nuages ont leur dynamique
atmosphérique lente ; ils ne battent pas au rythme de la musique.

Le mode actif masque les anciens voiles, mots, encres et particules abstraites.
Pigment Drift et la réaction-diffusion ne tournent pas ; même l’atlas aquarelle
historique n’est pas calculé pour cette scène. Leurs modules et sauvegardes
restent disponibles pour le retour arrière.

Deux appels de rendu sans précipitations, trois avec précipitations. Pas de
nouveau contexte, de render target, de lumière à ombre ou de passe de bloom.
Les tableaux de positions, tailles, tri et densités sont réutilisés. L’atlas GPU
est partagé entre les éléments et libéré au démontage. La qualité adaptative
existante réduit le pixel ratio en cas de ralentissement. Ce budget n’est pas
une mesure de FPS sur appareil physique.

## Retour arrière

`ATMOSPHERIC_WEATHER = false` dans `src/simple/WeatherAtmosphere.ts`, puis
reconstruire, rétablit les univers abstraits composés. `MONUMENTAL_STUDY` doit
rester `false` pour le parcours par émojis. L’étude indigo est un mode alternatif
historique, pas le parcours actif.

## Contrôles

La suite `weather-atmosphere` vérifie les mélanges de climats, les différences
réelles des six rendus GPU capturés, les changements de point de vue sans nouvelle
allocation de ressources, la brume d’entrée/sortie, son gel à temps constant,
la libération des textures et le plafond de trois appels. Les suites de parcours
vérifient les émojis, la sauvegarde, le gyro simulé et la restauration WebGL.
La suite audio conserve les contrôles de décodage, lecture, volume, silence,
reprise et erreur réseau. Captures inspectées ; pas de test sur téléphone
physique ni de test prolongé prétendu.

Validation de livraison : build TypeScript/Vite réussi ; douze tests actifs ont
passé pour le parcours auteur, la palette mobile, le gyro simulé, la restauration
WebGL, les climats et rendus GPU, la brume, les ressources et la lecture audio.
Après le dernier ajustement des nappes basses, le build et les trois contrôles
atmosphériques ont été réexécutés avec succès. Les variantes abstraites conservées
ont également été vérifiées isolément lors d’une série précédente. Aucun test
mobile physique n’est déclaré.
