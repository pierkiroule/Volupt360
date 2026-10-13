# Instrument échohypnotique — mondes aquatiques procéduraux

Le son par défaut est désormais produit par un moteur aquatique en AudioWorklet. Aucun sample instrumental, fichier sonore, bibliothèque audio ou service externe n’est utilisé pour ces trois mondes. Les ambiances MP3 et les fragments vocaux existants restent accessibles dans leurs modes et configurations précédents.

## Trois identités

| Scène graphique conservée | Monde sonore | Langage                                                                                                          |
| ------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------- |
| Le Souffle                | Source       | Gouttes cristallines à attaque nette, petits ruissellements, do lydien, 64 BPM, motifs espacés.                  |
| Les Marées                | Rivière      | Impacts liquides, bulles moyennes, écume et courants plus denses, ré dorien, 76 BPM, groove chaloupé.            |
| La Ramure                 | Abysses      | Grosses bulles graves, turbulence sombre, longues résonances, mi pentatonique mineur, 70 BPM, contretemps lents. |

Les trois cartes d’accueil indiquent leur monde sonore. Les identifiants, répartitions de brosses et rendus graphiques sont conservés.

## Synthèse et architecture

- `WaterDSP` produit le signal échantillon par échantillon. Les bulles s’inspirent de la relation acoustique de Minnaert entre rayon et fréquence, avec un glissement amorti. Les gouttes combinent un impact bruité et quatre modes résonants amortis. L’écume utilise un bruit filtré bref. Le courant superpose une turbulence filtrée et huit microbulles réutilisables, avec des intervalles irréguliers reproductibles.
- `WaterProcessor` exécute ce DSP sur le thread audio. Déclenchements et arrêts utilisent l’horloge audio. La boucle ne crée pas de nouveaux tableaux. Les coefficients d’amortissement sont précalculés ; les modes supérieurs restent sous Nyquist aux fréquences d’échantillonnage prises en charge.
- `createWaterAudio` charge une seule fois le module par AudioContext. Vite construit un asset autonome contenant le DSP. Les sources arrêtées ferment leurs ports et libèrent leurs connexions.
- `createWaterPercussion` réemploie le séquenceur existant : les graves deviennent des bulles, les frappes deviennent des gouttes et les shakers deviennent de l’écume.
- `createWaterReverb` calcule une réponse impulsionnelle stéréo reproductible au démarrage, sans téléchargement. Chaque monde possède une profondeur et un amortissement différents.
- `sonicUniverses` décrit la gamme, la progression, les mélodies, le groove, les couleurs aquatiques et la graine de chaque monde.

Il s’agit d’une modélisation acoustique artistique simplifiée ; ce moteur ne simule pas toute la dynamique des fluides.

## Composition et peinture

Le séquenceur sur seize croches conserve les mélodies composées, basses et réponses sur quatre phrases. Les hauteurs appartiennent à la gamme de leur univers, y compris les microbulles du courant. Un ordonnanceur de 40 ms prépare les événements avec 160 ms d’anticipation ; il saute les événements manqués au lieu de les jouer en rafale.

Les dépôts de l’oizo déclenchent leurs notes et enrichissent les motifs mémorisés. La brosse choisit la matière, la hauteur du dépôt influe sur la note et la position moyenne place la source HRTF. La peinture infléchit les accents et la densité du courant. Les anciennes traces rencontrées rappellent leur motif. Les motifs sont limités à 80 et supprimés avec les marques. La musique seule ne peint pas.

Le signal complet, avec percussions et réverbération, passe dans le compresseur et l’analyseur existants. Il continue à influencer le vol, les pigments et les particules. Le lecteur vocal exclusif et le chargement d’ambiance ne sont pas réécrits ; les fragments vocaux ne reçoivent pas ces effets instrumentaux.

## Ressources et compatibilité

Dix voix tonales et huit percussions au maximum, en comptant les sources en cours d’arrêt, plus un courant permanent. Chaque voix possède un nombre fixe de résonateurs. Les pauses atténuent le mix, annulent les événements anticipés et interrompent le calcul du courant. Les sources et ports sont libérés à la fin, au changement d’univers et à la destruction, y compris les sources arrêtées pendant une pause.

Les changements d’univers asynchrones possèdent un compteur de requêtes : un chargement ancien ne peut pas réactiver un univers quitté. Les erreurs de chargement sont affichées.

AudioWorklet nécessite HTTPS, ou localhost en développement. Le navigateur Chromium réel utilisé dans les tests exécute le moteur. Les téléphones et casques physiques ne sont pas testés ; la qualité artistique et la fluidité matérielle demandent encore une audition et une mesure sur ces appareils. L’export vidéo existant reste mono, même si le direct conserve sa spatialisation HRTF et sa réverbération stéréo.

## Désactivation

`?sound=legacy` restaure la synthèse instrumentale précédente, conservée dans un module chargé uniquement sur demande. `VITE_ENABLE_WATER_SYNTHESIS=false` puis recompilation fait de même. `?instrument=off`, ou `VITE_ENABLE_ECHO_INSTRUMENT=false`, restaure toujours le parcours d’ambiance MP3. Aucun de ces interrupteurs ne modifie les brosses.

## Validation

Validation finale exécutée : 31 tests ciblés passent, ainsi que le build Vite, le contrôle Prettier et `git diff --check`.

Les tests audio vérifient le signal réel, les spectres distincts, le niveau, les crêtes sous polyphonie, les mélodies et percussions, la spatialisation, la pause et la reprise. Les tests aquatiques vérifient la reproductibilité à trois fréquences d’échantillonnage, les fins de résonance, le chargement unique du module, l’annulation des changements d’univers, les plafonds, le retour au moteur précédent et la capture audio horodatée destinée à l’export. Le test d’échec de chargement injecte explicitement un rejet de `addModule` ; les autres tests audio utilisent le DSP et l’AudioWorklet réels.

Les régressions ciblées couvrent la navigation, les gestes de peinture, les brosses et particules, la mémoire des traces et l’audioréactivité. Le démarrage des trois mondes est également vérifié dans le build de production avec une fenêtre de 390 × 844 pixels : un seul chargement de worklet et aucune erreur JavaScript. L’export PNG HD de ce build a produit une image de 1183 × 2560 pixels. L’encodage vidéo complet n’a pas été rejoué dans cette évolution ; son entrée PCM et ses horodatages ont été contrôlés. Ce contrôle ne remplace pas un essai sur téléphone physique.
