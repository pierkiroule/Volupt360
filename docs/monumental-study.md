# Étude I — Indigo & terre

Cette version se concentre volontairement sur une seule composition avant de
redécliner les émotions. La palette emoji et les variations visuelles précédentes
sont suspendues. Les choix locaux sauvegardés ne sont ni effacés ni réinterprétés.

## Composition

`MonumentalStudy.ts` dessine une formation principale à l’encre et deux plans
secondaires qui donnent de la profondeur au passage. Les trois surfaces partagent
une géométrie batched et un matériau. La palette fixe associe indigo profond,
terre cuite, bleu grisé et papier ivoire. Les grandes réserves, dépôts pigmentaires,
auréoles et grain fin remplacent l’empilement des effets décoratifs.

La texture aquarelle procédurale existante apporte trois échelles de matière.
La réaction-diffusion Gray–Scott agit sur les accumulations internes, sans afficher
ses cellules comme une mosaïque de petits anneaux. Le son module doucement le
pli des surfaces. Il ne s’agit pas d’une simulation physique complète de peinture.

Un skydome papier très discret enveloppe la formation, sans sol, soleil, pluie,
texte flottant, particules, filaments décoratifs ou filtres caméra. Le rendu utilise
deux appels de scène : voûte et formation. Les passes GPU de réaction-diffusion
restent supplémentaires. En mobile, la formation comporte 8 064 triangles ; avec
la voûte le total reste inférieur à 10 000 dans le test isolé. Aucun nouveau contexte
WebGL, sample ou dépendance. Pigment Drift reste disponible dans le code mais
n’est pas lancé par cette étude.

## Voyage et commandes

Le parcours fermé de 210 secondes approche la formation, traverse son ouverture,
passe derrière puis révèle son profil et reprend du recul. Les orientations sont
interpolées avec des angles continus, et ne basculent pas brusquement entre
regard vers le centre et regard vers l’avant. Le regard a toujours une cible à
huit unités du point nominal. Le pilotage tactile, la contemplation, le gyroscope
avec autorisation, le fallback tactile, la pause, le volume et le silence sont
conservés. L’ambiance locale utilise les instruments existants avec le profil
fixe water + longing ; ces IDs historiques n’interprètent pas le visiteur.

## Retour arrière

Définir `MONUMENTAL_STUDY = false` dans `src/simple/MonumentalStudy.ts`, puis
reconstruire, rétablit la composition et la palette précédentes. Le drapeau
`ENABLE_REACTION_DIFFUSION` reste indépendant. Les nouveaux matériaux et
buffers sont libérés dans `dispose()` ; la scène Three.js et les mécanismes
audio existants sont réutilisés.

## Vérification

Le build TypeScript/Vite passe. La suite `monumental-study` vérifie l’étude unique,
les deux appels de rendu, le contraste et les espaces clairs via lecture GPU en
sRGB, la fermeture et la continuité du trajet, pause/reprise, gyro simulé,
fallback sans capteur, perte/restauration réelle du contexte et conservation des
choix locaux. Les captures d’accueil, de traversée et de trois points du parcours
sont inspectées. La suite audio vérifie le décodage et la lecture des vrais
échantillons, volume, silence, reprise et erreur de chargement. Pas de test de
performance sur téléphone physique ni de test prolongé ; les anciens tests de
sélection des douze variantes concernent le mode précédent.
