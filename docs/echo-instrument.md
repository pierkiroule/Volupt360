# Instrument échohypnotique — trois identités sonores

La boucle relie la synthèse musicale, l’analyse sonore existante et la géométrie réellement peinte. Choisir un univers démarre son premier son organique après le geste autorisant Web Audio. Le fichier d’ambiance n’est plus imposé dans ce mode. Le Souffle commence par un timbre flûté, Les Marées par un timbre cristallin et La Ramure par un timbre boisé.

`sonicUniverses.js` définit trois langages musicaux indépendants :

- **Le Souffle** : do lydien, 64 BPM, longues enveloppes aériennes, timbres flûtés et réponses suspendues.
- **Les Marées** : ré dorien, 76 BPM, attaques cristallines, ondulations mélodiques et échos plus présents.
- **La Ramure** : la pentatonique mineure, 94 BPM, attaques boisées, phrases courtes et accents rythmiques.

`createEchoInstrument` utilise exclusivement Web Audio natif. Trois tables d’harmoniques sont calculées au démarrage de chaque univers, puis deux oscillateurs légèrement désaccordés enrichissent chaque voix. Une séquence de seize croches combine une mélodie composée, des réponses variables et une basse sur les deux demi-phrases ; une progression harmonique et des accents variables évitent une répétition uniforme. Le filtre et l’écho musical filtré sont propres à chaque univers. Cet écho concerne l’instrument, pas les fragments vocaux.

Le niveau instrumental et les enveloppes ont été renforcés. Un compresseur partagé garde une marge dans les scénarios de polyphonie testés, sans normaliser chaque note au même volume. Les attaques, silences, accents et durées restent contrastés. Le mode photo atténue aussi le retour d’écho, avec une rampe évitant une coupure brusque.

Les dépôts influencent la composition : l’identité de la brosse choisit le timbre, la hauteur du tracé choisit la note, et sa position moyenne place la source dans l’espace. Un motif est conservé par trace (80 maximum). La peinture suggère au plus une note par brosse toutes les 0,9 seconde ; dix voix simultanées maximum empêchent l’emballement de la boucle. Les motifs nourrissent la mélodie des phrases de huit pulsations, ou sont rappelés lors d’une véritable rencontre de l’oizo avec une ancienne trace. Le retrait de la marque retire également son motif. Il ne s’agit pas encore d’une analyse visuelle des pixels ni d’une composition à partir de la courbure détaillée.

Le mix généré passe par l’analyseur partagé et la réponse adaptative existante. Il influence à son tour le vol, les pigments, les particules et leur mouvement. Les pads et l’appui long contrôlent toujours les dépôts de l’oizo ; la musique seule ne peint pas. Le visiteur compose aussi par les régions qu’il habite et les matières qu’il choisit.

Chaque note possède un panner HRTF. L’écouteur suit la caméra réelle, transformée dans le même repère que les traces. En contemplation gyro, la tête et le regard changent la perspective sonore sans déplacer les motifs. Le casque est recommandé pour apprécier cette spatialisation. Le mode photo et la perte de visibilité/focus interrompent les voix instrumentales ; un geste ou le retour à la vue réactive reprend la respiration du monde. Les voix, oscillateurs, gains et panners sont déconnectés à leur fin ou lors de la destruction. Un unique ordonnanceur léger, réveillé toutes les 40 ms avec 160 ms d’anticipation, utilise l’horloge audio. Les retards sont sautés pour éviter une rafale de rattrapage. Les contretemps sont légèrement décalés selon le swing propre à chaque univers.

Les fragments poétiques sont conservés mais ne sont ni chargés ni joués par défaut. `VITE_ENABLE_POETIC_VOICES=true` les réintègre : une apparition peut se produire toutes les cinq rencontres, avec deux fragments par famille de brosse initiale et le verrou de lecture exclusive existant. La musique continue sous les paroles. Cette option demande une recompilation et n’ajoute pas de menu. Son intégration artistique et son rythme restent à affiner ; elle n’est pas le mécanisme principal.

Désactivation immédiate : `VITE_ENABLE_ECHO_INSTRUMENT=false` puis reconstruire, ou `?instrument=off` pour comparer le parcours d’ambiance MP3 précédent. La mémoire des traces possède toujours son propre interrupteur.

Validation exécutée : les six tests instrumentaux et les six scénarios ciblés d’audioréactivité, d’univers et de peinture par l’oizo passent, ainsi que le build et le contrôle de formatage. Les tests instrumentaux utilisent un vrai AudioContext : comparaison des spectres des trois univers, niveau RMS, crêtes sous forte polyphonie, silence après pause, spatialisation gauche/droite, génération par la peinture, mémoire bornée et reprise après photo. La qualité artistique demande encore une écoute sur casque et haut-parleurs physiques ; ces tests mesurent le signal et ne constituent pas une audition musicale. L’export vidéo conserve le mix audio existant, actuellement mono : il ne conserve donc pas la spatialisation binaurale du direct. Les vocaux optionnels n’ont pas été retestés dans cette évolution.

L’accueil présente la démarche échohypnotique comme une expérimentation artistique exploratoire, ouverte aux perspectives de l’hypnose contemporaine, du transnumérisme, des expériences transmodales et de la synesthésie. Le texte distingue les pistes de réflexion d’une démonstration de phénomènes établis. Le parcours reste accessible après la lecture sur mobile.

## Rythmes et mélodies

`createOrganicPercussion` ajoute trois percussions synthétiques : grave sinusoïdal descendant, frappe boisée et shaker en bruit filtré. Le tampon de bruit reproductible est créé une seule fois. Les motifs, accents, fréquences des corps et swing sont définis par univers dans `sonicUniverses.js`. Les percussions rejoignent le même compresseur et analyseur que la musique ; elles contribuent donc aussi à l’audioréactivité. Leur signal reste sec pour garder les attaques lisibles.

Les mélodies sont de vraies suites de degrés, durées et accents, avec des enveloppes courtes adaptées à l’articulation. Elles suivent la progression harmonique et prennent le timbre et la position des traces mémorisées. La quatrième phrase propose une réponse légèrement descendante. Le geste de peinture renforce doucement les accents, puis cette influence retombe. Les dépôts conservent également leurs notes propres.

Plafonds : dix voix tonales et huit percussions simultanées. Les sources sont déconnectées à leur fin ; pause, photo et destruction annulent aussi les percussions et les notes anticipées. Un test mesure six secondes de signal réel dans les trois univers, contrôle les variations de niveau, les crêtes, les compteurs mélodiques et rythmiques, les plafonds, le silence en pause et la reprise.
