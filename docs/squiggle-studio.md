# SQUIGGLE 360 •° — Dessiner. Animer. Habiter.

La route principale ouvre le studio TypeScript. La précédente expérience reste disponible sous `?squibble`, les autres routes historiques ne changent pas. Aucune bibliothèque ni API ajoutée. Les images publiques et les anciens moteurs restent dans le dépôt.

## Un projet, trois regards

Le format `squiggle360.project`, version 1, contient les points normalisés, pression, vitesse, temps relatif, graine, matières, couleur, taille, opacité, hybrides, effets et poids locaux, favoris, papier et position de la timeline. Les moteurs de rendu ne modifient jamais ces données.

- `model.ts` : types, validation stricte et bornée des imports.
- `ProjectStore.ts` : IndexedDB local, projets indépendants. Sauvegarde automatique après 600 ms, retour explicite en cas d'échec, export JSON disponible. Les autres stockages historiques ne sont pas effacés.
- `DrawingEngine.ts`, `StrokeGeometry.ts` : Pointer Events, pression du stylet, vitesse, interpolation/lissage, protection multitouch et gomme partielle avec remappage des effets. Les longs gestes sont segmentés pour borner les buffers.
- `BrushRegistry.ts`, `Renderer2D.ts` : douze générateurs graphiques, lavis et grain procéduraux, cache de calques recadrés plafonné à 12 millions de pixels, six favorites modifiables et hybride sur un même tracé. Les aperçus utilisent ces vrais moteurs.
- `EffectBrushEngine.ts` : douze comportements peints localement, poids par point, intensité, vitesse, rayon, durée/continu, activation et retrait. Calcul depuis les coordonnées originales à chaque instant, sans déformation cumulative.
- `AnimationTimeline.ts` : temps partagé, pause immédiate et interruption en arrière-plan, respect de la réduction du mouvement au démarrage.
- `TransductionEngine.ts`, `Renderer3D.tsx` : calques pigmentaires tessellés, courbes tubulaires, fibres, points et membranes selon les matières ; correspondance continue des coordonnées sous le curseur de profondeur. À zéro les calques retrouvent leur projection plane ; en profondeur ils se déploient autour du visiteur. Les textures du dessin sont utilisées, aucune génération de paysage figuratif.
- `ImmersiveCamera.tsx` : contemplation orbitale via OrbitControls, immersion tactile/gyroscope, recentrage, avance lente et limites de déplacement.
- `AudioEngine.ts` : graphe Web Audio facultatif, synthèse harmonique et souffle filtré, enveloppes, convolution procédurale, compression, spatialisation HRTF et suivi du regard. Volume, silence, pause et suspension en arrière-plan. Huit voix simultanées maximum.
- `ExportManager.ts` : PNG 1600 × 1200 du dessin, capture du point de vue 3D, JSON complet, WebM de huit secondes réellement encodé par MediaRecorder lorsqu'il est disponible. Annulation vidéo possible ; changement d'onglet annule l'export.
- `StudioApp.tsx`, `studio.css` : accueil, trois ateliers, historique (80 opérations), palette étendue, réglages, projets et exports. Outils de contemplation escamotés sans changer la taille du canevas ; retour à l'atelier toujours accessible.

## Conservation et limites explicites

Les fichiers sont stockés uniquement dans IndexedDB et exportés sur action volontaire. Aucune télémétrie, analyse émotionnelle ou interprétation. Une réinitialisation demande confirmation et archive une copie locale ; une nouvelle œuvre conserve l'ancienne. Si l'archivage échoue, l'application refuse de quitter la création et propose l'export JSON.

Limites de travail : 200 tracés, 1 800 points par segment, 120 000 points par projet, 80 effets et un million de poids locaux. L'atteinte d'une limite est signalée ; les données ne sont pas automatiquement effacées. Les exports JSON de plus de 64 Mo sont refusés pour protéger la mémoire. Le stockage local dépend des quotas et de la politique du navigateur ; le JSON permet une sauvegarde durable hors du navigateur.

Le WebM exporte l'animation 2D **sans piste sonore**. La capture 3D utilise la résolution du canevas courant. Les matières 3D sont une transduction graphique : voiles et fragments texturés, complétés par des géométries spécifiques ; aucune simulation physique complète d'eau, de papier ou de fibres. Le mouvement « Dissoudre » ajoute des particules et permet la recomposition, sans supprimer de tracés.

L'audio est une synthèse douce, pas un piano acoustique ni un enregistrement. Aucun casque VR/WebXR ajouté. Les effets se transposent en 3D par interpolation des poids sur les surfaces ; ce n'est pas un moteur physique volumétrique. La cible 60 FPS sur Galaxy S24 Ultra reste à mesurer sur matériel réel. La réduction de qualité diminue la résolution et les subdivisions ; les ressources GPU sont libérées au démontage. Les textures 3D sont plafonnées à 10 millions de pixels par œuvre, ou 4 millions en qualité légère.

Les tests historiques qui supposent l'ancienne route d'accueil doivent naviguer vers `?squibble`. La suite dédiée est `tests/studio.spec.js` ; elle ne remplace pas la validation du gyroscope réel, du confort vestibulaire et d'une session prolongée sur Android/iOS.

## Vérifications exécutées pour cette livraison

- TypeScript strict (`tsc --noEmit`) et build Vite : réussis.
- 16 tests Playwright ciblés : réussis, Chromium avec SwiftShader. Ils couvrent les neuf tests du studio, le rechargement hors ligne du build de production et six parcours de l'expérience conservée sous `?squibble`.
- Dessin et hybride, undo/redo, gomme partielle, douze rendus distincts, douze effets bornés/réversibles, JSON valide/invalide, IndexedDB et reprise, profondeur 0/50/100 %, capteurs simulés, PNG 1600 × 1200, vrai WebM, son effectivement non nul et nettoyage audio/GPU : contrôlés.
- Tactile émulé avec vrais événements tactiles Chromium, second doigt et réduction du mouvement : contrôlés.
- Non exécutés : session prolongée sur smartphone physique, mesure de 60 FPS sur Galaxy S24 Ultra, autorisations/capteurs sur iPhone réel. La suite historique complète n'a pas été exécutée.
