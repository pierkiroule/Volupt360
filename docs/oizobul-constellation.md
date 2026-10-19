# Oizobul — Le conte en constellation

Cette évolution part de main (77e6d98). Aucun module, contenu ou parcours Poetic Learning n’est réintroduit.

## Conte ouvert

Les 24 fragments de src/chill/oizobulStory.js sont éditables indépendamment du rendu : identifiant stable, titre, texte et matière associée. Deux à quatre phrases autonomes mettent en circulation les mêmes détails : plume, fenêtre bleue, branche qui fredonne, nuage cousu, goutte, carte humide et nacre.

Chaque fragment peut être rencontré d’abord ou en dernier. Aucun dénouement imposé, questionnaire ou interprétation de l’état psychologique. Les résonances sont littéraires et visuelles.

## Intégration au moteur existant

createVocalBubbles reçoit une option constellation, désactivée par défaut pour ses anciens usages. Dans ce mode :

- Les 24 sphères sont disponibles au démarrage ; la proposition progressive historique est désactivée.
- Une seule géométrie est partagée. Le shader rend les sphères lumineuses sans bloom ou stroboscope.
- La détection conserve la distance 3D réelle entre le déplacement et la bulle.
- Après une visite, la coque reste en place, assombrie. L’autopilote ignore cette bulle.
- Un retour volontaire en vol manuel permet de relire un fragment ; le retour automatique ne provoque pas de relectures répétées.
- Le mécanisme de disparition historique reste disponible hors constellation.

createSoundNest conserve le pilotage, le rig et les huit moteurs de matières existants. La matière automatique reste inactive avant la première sortie de bulle. Chaque fragment propose une matière ; si elle correspond déjà à la matière actuelle, la suivante est choisie afin de renouveler le sillage.

La peinture réutilise les deux émetteurs des ailes. Elle continue sans toucher, pendant les figures, et s’arrête en contemplation. Les traces sont archivées par le mécanisme existant : elles composent les liens réels entre les rencontres, sans réseau de fils préfabriqué.

Les surprises réutilisent les trois figures de vol existantes. Elles sont espacées de plusieurs dizaines de secondes, après au moins quatre secondes sans guidage et à distance d’une bulle. Le toucher annule la figure et rend le contrôle immédiatement. La préférence système de mouvement réduit désactive ces surprises.

## Interface et ressources conservées

La vue principale ne présente plus de palettes de brosses ou de boutons d’acrobaties. Pause, volume et sortie restent dans les outils pliables. Le titre et le fragment apparaissent progressivement dans la contemplation et restent lisibles jusqu’à la reprise, sans disparition automatique après cinq secondes.

Le parcours historique reste disponible avec ?original=1. Les anciennes phrases, menus et interactions restent intacts sur cette route. Les anciens tests gardent leurs assertions et ciblent cette route.

Gravity, son pipeline audio, la caméra de suivi, les permissions gyroscope et l’alternative tactile, la timeline de six minutes de vol actif, le séchage final et l’export PNG HD sont conservés. Aucun backend ou dépendance ajouté.

## Vérification

Les tests dédiés couvrent les 24 fragments, leurs motifs récurrents, les sphères initiales, les collisions, l’extinction sans suppression, l’absence de peinture avant visite même au toucher, la lecture prolongée, les matières successives, la peinture sans toucher, une surprise automatique, son interruption manuelle et la libération de la géométrie GPU partagée.

Le test des surprises accélère uniquement les délais de déclenchement dans une fixture ; il utilise ensuite les vrais moteurs de vol, de peinture et de caméra. Les autres scénarios vérifient les interactions historiques.

Limites : mobile vérifié en émulation Chromium, pas sur Android/iOS physique. Aucune nouvelle mesure du tas JavaScript ou de fluidité soutenue sur appareil physique. Les 24 textes sont des créations originales à relire éditorialement avec le public visé. L’ordre de visite et le rythme de lecture restent libres.

Résultats exécutés : 38 tests réussis (3,1 minutes), puis les six scénarios du conte rejoués avec succès après les derniers ajustements. Le build Vite, Prettier sur les fichiers modifiés et git diff --check passent.

## Accueil poétique

StoryWelcome remplace uniquement l’accueil du parcours constellation. Le logo manuscrit utilise la fonte Caveat déjà présente dans le dépôt. Une illustration SVG et des mouvements CSS lents évoquent les bulles, les ailes et le sillage ; le lavis réutilise la texture alpha existante. Aucune bibliothèque ni ressource réseau supplémentaire.

L’invitation et le bouton d’envol précèdent les explications. Deux sections natives dépliables présentent le transnumérisme et l’échohypnose comme une démarche artistique. Le choix du gyroscope reste explicite et le lancement audio/permissions conserve le même gestionnaire de clic. Le parcours historique garde son accueil avec ?original=1.

Les animations décoratives s’arrêtent avec prefers-reduced-motion. L’accueil défile verticalement sur petit écran, sans défilement horizontal. Le texte, les contrôles clavier et le lancement sont vérifiés en Chromium, avec vues mobile et ordinateur.

Validation de l’accueil : 9 tests ciblés réussis (accueil et parcours du conte), build Vite et formatage validés. Captures mobile et ordinateur inspectées. Les contrôles mobiles sont des émulations, sans revendication de test sur appareil physique.

### Lisibilité des fragments

Les fragments utilisent une police système sans empattement, en bas de la vue 360°, au-dessus du bouton de reprise. Texte noir à 70 %, contour blanc et fond blanc à 70 % : l’opacité n’affecte pas globalement les contours. La zone est défilable si nécessaire ; sa hauteur est réduite en paysage pour dégager le centre du regard.

Vérifications : rendu et positions contrôlés en portrait 390 × 844 et paysage 844 × 390, contrôle du centre dégagé en paysage, scénario de lecture/reprise réussi et build Vite validé. Pas de test sur téléphone physique.
