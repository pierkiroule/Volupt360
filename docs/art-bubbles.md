# Œuvres rencontrées dans Émociel

Trois bulles sont ajoutées au monde existant, sans modifier le vol, le gyroscope ou la musique. Leur traversée (distance au segment 3D parcouru par la caméra) révèle une œuvre une seule fois par sélection. Le panneau Œuvres permet aussi de les ouvrir sans devoir viser. La révélation est refermable et le vol reste disponible.

## Sélection

`src/simple/ArtCollection.ts` contient les correspondances éditoriales émotions/artistes et les cibles de teinte/luminosité. Les candidats de l’Art Institute of Chicago sont classés selon leurs couleurs lorsqu’elles sont renseignées, leurs titres abstraits et les choix ordonnés. Trois œuvres distinctes reçoivent les rôles Écho, Nuance, Ouverture. Ces associations artistiques ne constituent aucune interprétation psychologique.

Seules les réponses avec `is_public_domain === true` et un identifiant image valide sont utilisées. Les images IIIF et liens sources sont construits à partir des identifiants retournés par le musée. L’artiste, le titre, le musée et la mention domaine public / CC0 sont accessibles dans Sources. Aucun appel IA, serveur ou nouvelle dépendance.

## Ressources et erreurs

Métadonnées en cache local pendant sept jours, une entrée par combinaison visitée. Les images utilisent le cache HTTP du navigateur. Trois textures au maximum dans la scène ; textures et matériaux libérés à chaque changement, y compris les chargements arrivant après destruction. Géométries partagées. Les requêtes ont un délai maximal de douze secondes et sont annulées quand la sélection change. Une erreur réseau conserve entièrement le ciel et affiche l’indisponibilité dans Sources. Un échec image/CORS n’affiche pas de fausse œuvre.

## Limites

Le musée a renvoyé HTTP 403 depuis l’environnement de développement, y compris après nouvelle tentative réseau. Le parcours a donc été vérifié avec des réponses simulées, pas avec un téléchargement réel du musée. Disponibilité des images réelles et CORS à confirmer sur le déploiement. La sélection par métadonnées est une première approximation éditoriale, pas un catalogue d’œuvres individuellement validées : une curation manuelle restera préférable pour une correspondance particulièrement fine. Certaines collections peuvent fournir moins de trois œuvres éligibles ; aucune œuvre protégée n’est alors utilisée pour compléter.

Les textures sont des photographies planes dans des membranes sphériques, pas des tableaux reconstruits en volumes ou panoramas. Pas de validation sur téléphone physique effectuée.

## Correction du chargement

Les recherches filtrent désormais le domaine public **avant** pagination via la requête Elasticsearch documentée de l’API. Chaque artiste peut échouer indépendamment ; une recherche complémentaire d’abstractions complète les pools trop courts. Le cache v3 invalide les anciens résultats. Sur Vercel, les réécritures `/museum-api/*` et `/museum-images/*` assurent des accès de même origine, sans serveur applicatif ni proxy tiers. Les réponses API disposent aussi d’une tentative directe de secours. Le bouton Réessayer relance la sélection sans quitter le ciel. Ces réécritures nécessitent un nouveau déploiement Vercel ; elles n’ont pas été validées sur un déploiement réel depuis cet environnement. Le musée reste inaccessible ici (403), donc aucune garantie de disponibilité distante n’est revendiquée.
