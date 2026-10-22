# Météo : du disque au monde

La route par défaut et `?meteo` ouvrent le disque météo. Le compositeur indépendant reste accessible avec `?paysage`. Les sauvegardes météo existantes sont conservées.

## Parcours

Onze émojis entourent le disque : choisir puis toucher le disque pour déposer une zone, la déplacer, ajuster proportion/opacité. L'entrée génère un seul monde et lance le vol en vue subjective. Un glissement ou le gyro optionnel oriente le regard et la direction. Sans commande, le voyage retrouve doucement le cœur du paysage. Contempler arrête les translations mais conserve la rotation du regard. Retour au disque conserve les zones ; annulation, rétablissement et sauvegarde locale restent disponibles.

## Une scène commune

`UnifiedWeatherWorld` relie le disque à `LandscapeScene`, sans seconde scène ou seconde caméra. `WeatherWorldComposer` construit un relief fractal continu à partir du mélange météo, avec des influences locales : bosses orageuses, hauteurs neigeuses, vallées pluvieuses, ondulations de vent. Chaque zone possède son secteur au sol, ses nuages et ses effets au-dessus. Les bosquets, végétaux et rochers réemploient `SceneComposer`, ses contraintes de pente et de terrain, ses groupes naturels et son couloir dégagé. Leurs couleurs reprennent les pigments des zones voisines.

`weatherWorld.worker.ts` effectue la composition hors du thread de l'interface, avec secours local si les workers sont indisponibles. Le même Canvas contient le skydome aquarellé, les phénomènes météo légers (voiles/particules), les oiseaux d'encre, le terrain, l'eau et les objets instanciés. Le gyro calibre le cap au premier événement du capteur, sans attendre le premier rendu. L'horizon reste horizontal.

Un modèle Poly Haven compatible peut enrichir la scène après son apparition. Une indisponibilité réseau laisse entièrement fonctionnels les objets procéduraux. La source CC0 apparaît discrètement lorsqu'un modèle est chargé. La bibliothèque existante borne téléchargements, clones et mémoire ; le démontage annule les requêtes et libère les ressources.

## Musique

`weatherScore.ts` transforme les surfaces pondérées par leur opacité en paramètres Strudel communs à la composition du monde. Les signatures harmoniques dominantes sont choisies par poids ; toutes les zones contribuent à la densité, au relief musical et à la graine. Ce sont des correspondances artistiques, sans interprétation psychologique.

Le moteur musical existant est réutilisé : fondus, compression, pause et fermeture du contexte au démontage. Activation volontaire par ♪ ; retour au disque ou arrière-plan suspendent la musique. Aucun sample distant ni appel de génération.

## Limites

Musique stéréo, sans sources météo positionnelles. Les modèles réels Poly Haven restent non validés depuis cet environnement (blocage réseau) ; le secours procédural et un chargement glTF avec dépendances synthétiques sont vérifiés. La simulation Chromium du gyro ne remplace pas la validation et l'écoute sur téléphone réel. Aucun objectif de FPS sur appareil physique n'a été mesuré.
