# Collection de brosses issues des chants

La scène n’affiche plus de planètes. Un menu horizontal en bas contient **une seule brosse au départ**, puis le bouton « Nouvel oiseau ». Chaque ajout réussi crée une matière indépendante, sélectionne celle-ci et conserve les précédentes. La collection appartient à la session et reste disponible en changeant d’univers. Recharger la page recommence avec une brosse. Le plafond de 18 protège les ressources mobiles et réutilise les emplacements du moteur existant.

## Un chant avant une matière

`drawRecording()` interroge les observations sonores d’oiseaux iNaturalist, d’abord avec le filtre `threatened=true`. Les trois pages autorisées sont parcourues dans un ordre mélangé avec `crypto.getRandomValues`. Un enregistrement est tiré parmi les résultats autorisés de la première page contenant une nouvelle espèce. Si aucune espèce menacée compatible n’est trouvée, la même recherche examine les oiseaux sans ce filtre. Il s’agit d’un tirage dans cette fenêtre bornée de l’API, pas d’un tirage uniforme de toutes les observations mondiales.

Les espèces déjà utilisées dans la collection sont exclues. Chaque ajout refait une requête de sélection ; le cache des fichiers reste partagé. Les licences propres aux fichiers sont toujours limitées à CC0 et CC BY, et les hôtes restent vérifiés. Les règles de crédits et le relais CORS sont détaillés dans [l’intégration iNaturalist](inaturalist-bird-brushes.md).

`createBirdSongs.generate()` télécharge et décode réellement le fichier avant de confirmer la création. Jusqu’à trois candidats différents peuvent être essayés si des fichiers sont indisponibles. Une requête de création au maximum est active ; aucun ajout vide n’est validé. En cas d’échec, le menu conserve la première place en attente ou la collection existante et permet une nouvelle tentative. Le tracé de la première brosse attend sa construction, sans matière fictive ni son synthétique de remplacement.

## Construction du visuel

`generativeBrush.js` analyse un nombre borné d’échantillons de l’extrait décodé, hors boucle de rendu :

- Énergie RMS et contraste de l’amplitude.
- Variations entre échantillons adjacents, comme indice approximatif de brillance sonore.
- Enveloppe normalisée de 32 régions de l’enregistrement et variations de cette enveloppe.

Ces valeurs, avec une graine dérivée des identifiants du chant et de l’espèce, composent une famille de géométrie, une couleur, une largeur et une opacité. Les variations de l’enveloppe déterminent aussi la répartition du pigment, et la brillance/contraste influencent l’échelle et la granulation de la texture aquarellée. Le même enregistrement analysé avec les mêmes valeurs redonne la même matière. Deux chants ne sont donc pas seulement deux étiquettes sur des brosses prédéfinies.

Les 18 moteurs artistiques restent les primitives de rendu : rubans, calligraphies, dépôts, réseaux et particules. Ils ne sont pas réécrits. Le profil généré choisit et paramètre ces primitives. Les brosses à ruban utilisent la largeur générée ; les formes de particules conservent leurs géométries spécialisées, avec la couleur, l’opacité et la texture issues du chant. Les correspondances sont plastiques et heuristiques, pas une reconnaissance musicale ou une propriété psychologique attribuée à une espèce.

## Jouer et sculpter

Un toucher sur une entrée du menu sélectionne cette matière. Maintenir le canevas en FPV fait tracer l’oizo et joue son véritable chant ; relâcher conserve le fondu de sortie. Glisser continue de guider l’oizo, sans dessiner avec le doigt. Les réactions à l’audio réellement lu restent actives sur le vol, les pigments et les particules. Le menu est masqué en mode photo pour conserver le cadrage.

Les textures sont créées seulement pour les matières confirmées, à 256 × 256 pixels, et sont libérées avec le moteur. Il n’y a plus de géométrie, de halo, de test de collision ni de raycasting des planètes dans le moteur actif. Le module historique `CelestialBrushes.js` reste dans le dépôt mais n’est plus importé par l’application.

## Tests et limites

Le parcours mobile vérifie une brosse initiale, un ajout, l’absence de planètes, la différence de vignette et d’espèce, la sélection réversible, la peinture avec le chant réel décodé depuis la fixture et le cadrage photo. Un échec réseau pendant un ajout conserve la brosse existante ; une nouvelle tentative réussit sans doublon. Un test acoustique conserve l’identité du fichier et fait varier uniquement sa forme d’onde : les indices acoustiques, paramètres et textures résultants changent, tout en restant reproductibles.

Les fixtures audio des tests sont fabriquées uniquement pour tester le transport et l’analyse ; elles ne sont pas livrées comme chants de remplacement. L’environnement refuse toujours les connexions à iNaturalist (HTTP 403), donc ni les associations obtenues en production ni l’écoute de vrais chants en ligne ne sont déclarées vérifiées. Le gyroscope matériel, la fluidité sur téléphone physique et l’encodage vidéo complet restent à vérifier.

Validation exécutée : 16 tests Playwright ciblés et 4 tests Node réussis. Après le dernier ajustement des particules et du défilement du menu, les 4 tests concernés ont été rejoués avec succès. Compilation Vite, Prettier et `git diff --check` sans erreur.
