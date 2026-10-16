# Chants réels des brosses — iNaturalist

Les 18 brosses existantes reçoivent chacune l’enregistrement d’une espèce distincte, lorsque le catalogue fournit suffisamment d’enregistrements compatibles. Les planètes, le double tap, le halo bleu et le vol sont conservés. Maintenir le canevas fait sculpter l’oizo et déclenche le chant ; relâcher produit un fondu de sortie d’environ 650 ms. Le fondu d’entrée dure 180 ms.

## Catalogue et priorité aux espèces menacées

`src/audio/birds/catalog.js` interroge l’API publique `/v1/observations?sounds=true`, avec `taxon_id=3` (Aves), `rank=species` et, en priorité, `threatened=true`. Trois pages de 100 observations maximum sont examinées pour ce groupe. Si nécessaire, trois pages supplémentaires d’oiseaux sans ce filtre complètent les associations. Le tri privilégie les espèces issues du filtre menacé, puis les identifiants taxonomiques ; les doublons d’espèces sont écartés.

« Menacée » désigne ici le résultat du filtre iNaturalist, qui peut dépendre des statuts géographiques disponibles. Ce n’est pas une certification indépendante du statut mondial UICN. Les identifications et le contenu sonore sont ceux de la communauté iNaturalist : le code ne reconnaît pas acoustiquement les espèces. Aucun nom ou enregistrement fictif n’est livré pour compléter le catalogue. Si moins de 18 espèces compatibles sont disponibles, les brosses non associées restent silencieuses et l’interface l’indique.

La disponibilité étant dynamique, les espèces effectivement associées sont présentées dans les crédits de la session, plutôt que dans une liste codée en dur non vérifiée. Le catalogue local expire après 24 heures. Le bouton de nouvelle tentative force son actualisation.

## Licences et export

Seule la **licence propre au fichier sonore**, `sound.license_code`, est utilisée : CC0 ou CC BY. La licence de l’observation ou d’une photo ne remplace jamais celle du son. Les fichiers sans licence, NC, ND et SA sont exclus de cette première version pour éviter des conditions incompatibles avec la réutilisation générale des œuvres exportées.

Le panneau repliable indique espèce, attribution fournie par iNaturalist (à défaut nom/login de l’observateur), page source et lien de licence. Les crédits des chants effectivement démarrés sont téléchargeables en texte, également depuis le cadrage vidéo. Ils mentionnent le découpage en extrait, le bouclage, les fondus et le mixage. **Le fichier de crédits doit accompagner le partage d’une vidéo contenant du CC BY** ; ces crédits ne sont pas incrustés dans les pixels ni intégrés automatiquement aux métadonnées du conteneur vidéo. Les sons utilisent le même bus maître que la capture audio existante ; l’encodage complet d’une vidéo n’a pas été rejoué pour cette évolution.

## Lecture et réactivité

`createBirdSongs.js` utilise exclusivement les octets des enregistrements reçus et un `AudioBufferSourceNode`, sans oscillateur, synthèse, TTS ou chant de remplacement. Un préchargement silencieux de la matière initiale, puis de la planète sélectionnée, réduit le délai du premier geste. Si le téléchargement n’est pas terminé, le panneau indique le chargement. Un relâchement invalide le départ différé : le son ne se met pas à jouer après le geste.

Les fichiers sont décodés par le navigateur. Les 45 premières secondes maximum sont conservées pour la lecture en boucle pendant le geste ; les fichiers de plus de trois minutes ou de plus de deux canaux sont refusés après décodage. Le décodage natif initial peut donc temporairement utiliser plus de mémoire que l’extrait conservé. La transition de boucle dépend du contenu de l’enregistrement ; il n’y a ni reconstruction ni remplacement des silences ou bruits naturels.

L’analyseur situé après le gain de fondu mesure RMS, énergie, graves, aigus, flux et centre spectral. Ces données rejoignent `getVisualFeatures()` et les chemins existants du vol, de la vibration des matières et des particules. Les formes sculptées ne lancent plus de notes synthétiques, et l’ouverture des univers ne démarre plus l’ancien générateur ambient quand cette fonctionnalité est active. Les anciens curseurs ÉCHO/HYPNOS sont masqués dans ce mode, puisqu’ils pilotaient le synthétiseur. Les imports d’ambiance existants restent disponibles dans leur parcours historique ; aucun chant synthétique ne prend le relais d’un échec.

## Cache et réseau

- Métadonnées dans `localStorage`, pendant 24 heures, sans compte ni données personnelles ajoutées.
- Octets dans Cache Storage, avec plafond de 64 Mio et 24 entrées, éviction des plus anciennes entrées. Les écritures sont sérialisées dans la page. Les modes privés ou quotas pleins n’empêchent pas une lecture en mémoire.
- Deux extraits décodés maximum dans le cache mémoire, soit environ 33 Mio pour deux extraits stéréo de 45 s à 48 kHz, hors lecture active, fondus et décodage temporaire.
- Requêtes bornées dans le temps ; abandon au démontage. Fichiers limités à 8 Mio, avec contrôle pendant la lecture du flux même sans Content-Length.

Le navigateur essaie d’abord une requête CORS normale. En cas de refus, `/api/bird-catalog` et `/api/bird-recording` fournissent un relais Vercel de même origine. Le relais audio accepte des identifiants d’observation/son, **jamais une URL arbitraire** : il recharge les métadonnées iNaturalist, vérifie la licence et l’appartenance du son, puis récupère le fichier sur `static.inaturalist.org` ou `inaturalist-open-data.s3.amazonaws.com`. Chaque redirection est vérifiée ; les autres hôtes et les contenus non audio sont refusés. Les sources externes comme SoundCloud ne sont pas prises en charge. Sans relais déployé, les sources qui refusent CORS restent indisponibles.

Les deux fonctions sont émulées par Vite en développement et déployables avec le projet Vercel existant, sans secret ni dépendance supplémentaire. Le cache HTTP public du relais est de 15 minutes pour le catalogue et d’un jour pour un enregistrement. Les erreurs réseau/API/format sont affichées sans son de secours.

## Vérification et limites

Le réseau de cet environnement a refusé la connexion à `api.inaturalist.org` (tunnel HTTP 403), y compris après nouvelle tentative avec autorisation. **Aucun appel réel réussi à iNaturalist ni aucune écoute d’un véritable chant en ligne n’est revendiqué ici.** La disponibilité du catalogue et les licences des associations effectivement obtenues devront être vérifiées sur le déploiement connecté.

Les tests de navigateur utilisent des réponses iNaturalist contrôlées et une petite fixture WAV construite uniquement pour tester le transport et l’analyse : elle n’est pas livrée dans l’application et ne remplace jamais un chant. Les tests Node contrôlent les vérifications du relais sans accès réseau réel.

Désactivation explicite : passer `ENABLE_BIRD_SONGS` à `false` dans `src/sonoizo/instrumentConfig.js`, puis reconstruire. Cela restaure le parcours musical antérieur ; ce n’est pas un mécanisme automatique de remplacement des chants.

Validation exécutée : 15 tests Playwright ciblés distincts et 4 tests Node du relais réussis. Après l’ajustement de l’accueil, les 7 tests navigateur concernés ont été rejoués avec succès. Compilation Vite, Prettier et `git diff --check` réussis. Les réponses réseau des tests sont contrôlées ; elles ne constituent pas une validation du service iNaturalist réel.
