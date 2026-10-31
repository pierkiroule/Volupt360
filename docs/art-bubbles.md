# Œuvres rencontrées dans Émociel — Wikimedia Commons

Le fournisseur Art Institute of Chicago a été remplacé par l’API publique Wikimedia Commons (`https://commons.wikimedia.org/w/api.php`). Aucun compte, clé ni serveur applicatif n’est nécessaire. `origin=*` permet les requêtes CORS publiques. Les anciennes réécritures Vercel et URLs IIIF du musée sont supprimées.

## Sélection artistique

`ArtCollection.ts` contient une table éditoriale émotions/artistes. Les recherches suivent les choix ordonnés ; trois œuvres distinctes reçoivent les rôles Écho, Nuance, Ouverture. Une recherche complémentaire d’abstractions complète les résultats trop courts. Le classement privilégie les titres évoquant des compositions abstraites. Il ne prétend pas analyser les couleurs des images, car Commons ne fournit pas les mêmes métadonnées que le musée. Les associations n’ont aucune valeur diagnostique et demandent encore une curation fine pour garantir la qualité de chaque correspondance.

## Droits et sécurité

Le parseur exploite `query.pages[].imageinfo[0]` et les `extmetadata`. Seules les mentions explicites CC0, Public domain / Domaine public ou PDM sont acceptées, sans restriction signalée. Les autres licences, notamment CC BY-SA, sont exclues. Les champs HTML sont convertis en texte ; aucun HTML distant n’est inséré dans React. Seuls les liens HTTPS de commons.wikimedia.org et upload.wikimedia.org sont autorisés pour les sources et images. Les URLs réelles de miniature sont fournies par l’API, pas inventées. Les crédits affichent l’artiste, la source et la licence effectivement retournée. Ces métadonnées constituent la vérification disponible ; elles ne remplacent pas une expertise juridique.

## Intégration et ressources

Les trois membranes de `ArtBubbles.ts` restent dans la scène et réutilisent les géométries. Une traversée réelle du segment de caméra déclenche la révélation une seule fois par sélection. L’œuvre peut aussi être ouverte depuis Sources. Le vol, le gyroscope et la musique restent inchangés. Trois textures au maximum, libérées au changement ou démontage, y compris les chargements tardifs. Cache de métadonnées v1 spécifique Commons, limité à douze combinaisons et sept jours ; cache HTTP navigateur pour les images. Délai maximal douze secondes par recherche, annulation lors des changements, erreur non bloquante et bouton Réessayer.

## Validation et limites

Build et tests automatisés exécutés. Les tests couvrent le format Commons, le refus des licences non admises, les sources, le cache, la reprise et la collision 3D. Les requêtes réelles Commons renvoient HTTP 403 depuis l’environnement d’exécution, y compris après tentative réseau supplémentaire : les données API ont donc été simulées dans les tests. Le chargement distant et les images réelles restent à confirmer sur le déploiement ; aucun succès réseau réel n’est revendiqué. Téléphone physique non testé. Les images sont des plans dans des membranes, pas des panoramas ni des reconstructions 3D des tableaux.
