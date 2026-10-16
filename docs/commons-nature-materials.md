# Matières de nature — Wikimedia Commons

Le fournisseur unique des photos et des chants est l’API publique `https://commons.wikimedia.org/w/api.php`, sans clé. Le lecteur Web Audio, les fondus, le cache borné, l’audioréactivité du vol et des brosses, l’ambiance MP3 et le skydome sont conservés.

## Rencontre aléatoire

La collection démarre avec une matière. « Nouvelle matière » tire un nouveau fichier de chant d’oiseau et une nouvelle photographie parmi mousse, plume, écorce, eau, lichen, fleur et feuillage. Les identifiants déjà présents sont exclus. Les thèmes sont mélangés avec `crypto.getRandomValues`, puis un résultat autorisé est tiré dans une fenêtre de recherche bornée : au plus trois thèmes photographiques ou quatre recherches audio (dont « bird » en dernier recours), trois pages et vingt fichiers par page. Les sons Ogg déclarés `application/ogg` sont acceptés uniquement si leur type média est `AUDIO`. Ce n’est pas une sélection uniforme de tout Commons.

La recherche MediaWiki utilise `generator=search`, l’espace Fichier (6) et `imageinfo` avec URL, MIME, taille et métadonnées de licence. Les photos proviennent de recherches bitmap de nature ; les formats JPEG, PNG et WebP sont retenus. Les descriptions explicitement marquées comme images générées par IA ou diagrammes sont écartées. Le contenu et l’identification de l’oiseau reposent sur les métadonnées Commons : aucune reconnaissance sémantique ni garantie scientifique n’est ajoutée.

Les chants utilisent les recherches audio « bird song », « bird call » et « birdsong ». Ce changement de fournisseur remplace la recherche et les URLs des enregistrements ; il ne réécrit pas leur moteur de lecture et ne produit aucun chant synthétique de remplacement.

## Transduction photographique

`commonsNature.js` décode la vignette Commons demandée à 384 pixels maximum, puis analyse une grille de 64 × 64 : palette de six couleurs dominantes, luminance, contraste, saturation et différences locales pour les contours. Le bitmap est fermé après lecture. Les originaux dépassant 16 mégapixels sans vignette ne sont pas retenus ; une seconde vérification est faite après décodage.

La matière abstraite combine cette analyse avec le profil acoustique du chant et une graine dérivée des deux fichiers. La photo choisit une famille parmi les 18 primitives existantes, la palette, l’épaisseur et l’opacité. Son champ de luminance et de contours est déformé organiquement puis recomposé en pigment : ce n’est pas un rectangle photographique plaqué sur la sculpture. L’enveloppe sonore influence encore la texture initiale. Pendant le geste, l’analyse du vrai chant anime le mouvement, les vibrations et les particules par les chemins existants.

La texture RGBA de 256 × 256 est créée hors boucle de rendu. Les champs de photo conservés représentent environ 8 Kio par matière ; le cache de sons décodés reste limité à deux extraits de 45 secondes. La collection reste limitée à 18 matières, conservées pendant la session. Aucun upload de photo personnelle ni nouvelle bibliothèque.

## Licences et crédits

CC0 1.0, CC BY et CC BY-SA 3.0/4.0 sont retenues. Le domaine public est accepté lorsque Commons indique explicitement « Public domain » et `Copyrighted=False`. La version exacte et le lien de licence sont lus dans `extmetadata.LicenseUrl` : CC BY 1.0, 2.0, 2.5, 3.0 ou 4.0 ne sont pas confondues. Les liens de licence relatifs au protocole sont normalisés en HTTPS. Les licences absentes, NC, ND et les anciennes versions de CC BY-SA sont exclues. Les adaptations combinant des médias CC BY-SA sont proposées sous CC BY-SA 4.0 : cette condition apparaît dans les crédits et le cadrage des exports.

Les auteurs, crédits fournis, pages des deux fichiers et licences sont affichés dans le panneau repliable. Le texte exportable rassemble les photographies transformées et les chants effectivement lus, en indiquant les transformations, extraits, boucles et fondus. Ces crédits doivent accompagner les images et vidéos partagées sous CC BY. Ils ne sont pas incrustés automatiquement dans les pixels ni dans le conteneur vidéo.

## Réseau, CORS et ressources

Les appels directs à l’API comportent `origin=*`. Le téléchargement passe par `fetch` CORS puis par un Blob décodé localement : aucun canvas contaminé par une image interorigine. Un refus CORS déclenche un repli sur les fonctions Vercel de même origine :

- `/api/commons-search` accepte uniquement un type, un thème autorisé et un décalage 0, 20 ou 40.
- `/api/commons-media` accepte uniquement un identifiant de fichier et un type ; elle relit la licence et l’URL dans Commons avant de télécharger.

Le relais n’accepte jamais d’URL arbitraire. Seul `upload.wikimedia.org/wikipedia/commons/` est autorisé, avec contrôle des redirections, du MIME et du poids du flux. Les fonctions s’exécutent aussi en développement via Vite et utilisent un User-Agent descriptif côté serveur.

Les fichiers sont limités à 8 Mio. Le cache de médias est borné à 64 Mio et 24 entrées, partagé entre photos et sons ; les anciennes entrées expirent par éviction. Les fichiers non décodables sont retirés du cache. Les anciennes métadonnées et l’ancien cache de sons sont abandonnés lors de la migration. Les délais sont bornés, les requêtes abandonnées au démontage, et les quotas ou modes privés n’empêchent pas une lecture en mémoire.

Un ajout est confirmé seulement après décodage du chant et analyse de la photo. Jusqu’à trois couples peuvent être essayés ; les fichiers refusés sont écartés de la tentative suivante. Un échec laisse intactes les matières précédentes et le bouton permet de réessayer. Aucun fournisseur de secours ni appel à l’ancienne API ne subsiste dans le code actif.

## Vérification et limites

La connexion réelle à Commons a été tentée dans cet environnement, puis retentée avec autorisation : le tunnel réseau a répondu HTTP 403. **Aucun téléchargement réel de photo ou de chant Commons n’est donc déclaré validé ici.** Les tests utilisent des réponses au format MediaWiki et des fixtures PNG/WAV non livrées ; la lecture du MP3 du dépôt reste testée réellement.

Les tests couvrent les licences et versions, les attributions sans HTML, la combinaison photo/chant, le repli CORS, les textures calculées à partir de couleurs et contours différents, les erreurs de décodage, le menu, les fondus et les protections du relais. L’accès aux vrais médias sur le déploiement, le téléphone physique, le gyroscope matériel et l’encodage vidéo complet restent à vérifier.

Validation exécutée : 22 tests navigateur ciblés et 5 tests Node du relais réussis, compilation Vite et contrôle Prettier réussis, `git diff --check` sans erreur. La recherche de références à l’ancien fournisseur dans le code actif et les tests ne retourne aucun appel résiduel.

### Correction de la découverte audio

Six tests Node et douze tests navigateur ciblés ont été exécutés avec succès : métadonnées Ogg, recherche élargie, licences, relais, création des matières, menu et lecture avec fondus. Les réponses Commons et les médias sont simulés dans ces tests ; cela ne valide pas la disponibilité du catalogue réel.
