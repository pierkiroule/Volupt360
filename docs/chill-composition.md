# Composition électro chill par les brosses

Le parcours actif utilise une composition procédurale à 78 BPM, sans sample ni bibliothèque externe. Le moteur audio natif, les brosses et le dialogue visuel existants sont conservés.

## Architecture

`ChillComposer` est une grammaire indépendante de Web Audio : transport en doubles-croches, harmonie commune et phrases de quatre mesures. Les nappes, la basse, les motifs et les gestes partagent deux actes harmoniques : Cmaj7 / Am7 / Fmaj7 / G6, puis Em7 / Fmaj9 / Dm7 / Gsus2. Les mélodies privilégient les notes de l’accord et un registre de 5 à 19 demi-tons au-dessus de la fondamentale. La conduite mélodique favorise les déplacements courts.

Les phases ouverture, sillage, envol et respiration s’étendent sur 48 mesures. La cellule mélodique revient tous les quatre groupes de phrases, avec mutations intermédiaires limitées, rotations courtes, silences et réponses. Un arc dynamique lent accompagne les 48 mesures. Les lignes soutenues utilisent des timbres de cordes et de souffle procéduraux ; la basse tient davantage ses notes et les percussions reculent. Le groove a un swing léger et des variations de vélocité bornées. Les gestes augmentent une activité amortie qui infléchit la densité, sans ouvrir de nouvelles notes hors harmonie.

`createChillDrums` synthétise kick sinusoïdal, percussion de bruit filtré et charleston doux. Le bruit est calculé une seule fois. Les sources sont bornées à 12 et libérées après chaque événement. La synthèse mélodique conserve sa limite de 10 voix.

`createEchoInstrument` branche la grammaire sur les sources, la spatialisation et les brosses. Les gestes sont quantifiés, leur durée est limitée pour laisser respirer l’arrangement, et les notes se terminent près des changements harmoniques. La basse reste centrée ; les mélodies empruntent les positions des traces. Les nappes s’inclinent légèrement sur le kick, sans pompage global. Le délai est calé sur une croche pointée au tempo. Le retour de réverbération est filtré et son entrée coupe les graves pour garder une basse lisible.

## Continuité et performances

La pause conserve la position musicale. Les longs retards de planification sont ignorés, sans déclencher une rafale de rattrapage. L’ordonnanceur programme une courte fenêtre en avance, avec l’horloge audio. Les historiques de traces restent bornés par le moteur existant ; la grammaire ne conserve qu’une cellule de cinq notes et ses compteurs.

Les anciens générateurs restent disponibles pour les parcours historiques, sans sélecteur supplémentaire. Les palettes sauvegardées, le mouvement, les filtres doux et les exports restent branchés au même graphe.

## Validation et limites

Tests de simulation sur deux heures : reproductibilité, diversité de phrases, conformité des notes à l’accord, registre et mémoire bornés. Tests de gestes arbitraires et de reprise sans rafale. Tests Web Audio natifs : signal mesuré, percussions déclenchées, limite des voix et continuité après pause. Contrôles ciblés de réverbération, filtres, composition par les brosses et mobile.

Ces vérifications établissent les règles et le fonctionnement, pas une garantie esthétique. Une écoute critique sur casque et téléphone reste nécessaire pour juger l’équilibre, la musicalité et la fatigue d’écoute. La cohérence harmonique ne signifie pas absence de répétition : motifs et cycles composent une structure qui se transforme.

## Orchestration de chambre

Les timbres `bowed` et `air` ajoutent des modes harmoniques, un léger vibrato progressif, une composante de souffle filtré et une enveloppe qui se déploie au lieu d’une simple attaque pincée. Ils sont synthétisés : ils ne constituent pas des enregistrements acoustiques ni une simulation complète d’orchestre. Les nappes gagnent une composante harmonique discrète, tandis que le bruit de fond aquatique est réduit.

Les gestes clairs appellent le timbre de souffle, les matières sombres les cordes soutenues. Le thème principal et ses réponses utilisent la même harmonie, avec un second acte enrichissant la couleur. Les tests vérifient les enveloppes, la hauteur et les signaux finis ; une capture native de 18 secondes est produite dans `/tmp/chamber-preview.wav` pour une revue à l’écoute, sans ajout de sample au produit.
