# Atelier de brosses procédurales

Le bouton + ouvre un atelier modal simplifié : forme (les 18 familles existantes), couleur et matière (lavis/granulation/nervures/marbrures). « Affiner » révèle le nom, l’épaisseur et l’opacité. L’aperçu représente la matière générée, avec le glyphe de la famille choisie ; il ne simule pas le tracé 3D. « Surprise » renouvelle la combinaison et sa graine. Annuler ou Échap ferme sans ajout.

Créer ajoute et sélectionne la brosse. Les profils passent par le moteur de peinture existant. Le son ambiant continue de moduler les visuels. Le vol, les caméras, le ciel et les exports sont conservés.

## Génération et mémoire

`src/materials/proceduralBrush.js` valide les paramètres et génère un champ procédural de 64 × 64 pixels, une palette et un profil de texture. La graine assure une génération reproductible. Les textures sont fabriquées une fois par création, hors boucle de rendu. Les textures de prévisualisation sont libérées après conversion en image ; les textures de scène restent libérées par le moteur.

Aucune photo ni requête externe n’intervient. L’ancien adaptateur interne garde temporairement le nom `createBirdSongs` pour limiter la migration de l’API du moteur, mais ne génère que des profils procéduraux.

## Sauvegarde

Chaque création sauvegarde automatiquement la palette ; le bouton « Sauvegarder la palette » permet aussi de confirmer l’enregistrement. Le stockage local `echohypnos-procedural-palette-v1` ne contient que des configurations et graines, au maximum 18 brosses. Les champs sont validés au chargement ; une donnée corrompue ne bloque pas l’application. La palette reste sur cet appareil et ce navigateur, sans compte ni synchronisation. Vider les données du site efface cette sauvegarde. La sculpture elle-même n’est pas sauvegardée par cette fonction.

Si le stockage est bloqué ou plein, un message explique que la palette reste utilisable pour la session. Les textures sont reconstruites à l’identique au prochain chargement depuis les paramètres valides.

## Vérification

Tests navigateur : choix des paramètres, création de plusieurs brosses, sculpture, sauvegarde et restauration des mêmes textures après rechargement, ajout après restauration, annulation, surprise, stockage indisponible et validation des configurations. Tests ciblés des ailes, du ciel, de l’ambiance et du menu également exécutés. Téléphone physique et performance mobile réelle restent à vérifier.

## Matières évolutives

Les shaders font dériver lentement les pigments et onduler les surfaces, avec un déphasage par trace. Les graves renforcent les ondulations, l’énergie nourrit le pigment et les accents ajoutent une impulsion brève. Les six familles de particules modulent leur expansion et leur flottement. Les anciennes traces répondent aussi, sans nouvelle génération de texture. La pause photo fige l’évolution avec le reste de la scène. L’analyse utilise le signal musical avant le gain de fond pour garder sa dynamique visuelle ; le volume de lecture reste inchangé.
