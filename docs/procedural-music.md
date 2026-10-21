# Squibble360 — musique procédurale

Le bouton de lecture ouvre le son après un geste explicite. Le panneau « Musique »
se replie et conserve les réglages. Les emojis inspirent une graine et un réglage
initial : ces correspondances sont artistiques, sans analyse psychologique.

## Modules

- `src/audio/procedural/musicScore.js` : partition déterministe avec Tonal.js,
  cinq profils, huit paramètres, progressions diatoniques, variations de motifs,
  mémoire des 12 derniers motifs, silences et lignes de 3/4, 5 et 7 pas.
- `ProceduralMusicEngine.js` : instance partagée, contexte et transport Tone.js,
  six instruments avec polyphonie plafonnée. Piano de synthèse additive avec
  bruit d'attaque filtré, nappes, cordes, percussion, texture FM et cloche FM.
  Ce piano n'est pas un piano acoustique échantillonné.
- Traitement : passe-bas, EQ, compression douce, convolution avec une réponse
  impulsionnelle générée localement, échos filtrés, limiteur à −1 dB.
- `MusicPanel.jsx` : interface et chargement différé du moteur ; destruction au
  démontage. Une interruption du contexte appelle une reprise explicite.
- `AudioFeatures.js` analyse le niveau RMS, trois bandes FFT et leurs variations
  avec des enveloppes indépendantes. Les rubans vivants se déforment selon les graves,
  leurs courants suivent les médiums et les détails répondent aux aigus. Des
  filaments fins et les particules ont des réponses locales différentes. La
  pause visuelle fige ces réactions ; couper le son les laisse se dissiper. Aucun déplacement
  brusque de caméra n'est lié au son.

Tous les instruments ont une enveloppe et une spatialisation stéréo. Aucun son,
modèle ou sample n'est téléchargé. Les changements de paramètres sont lissés ;
les changements harmoniques prennent effet à la prochaine frontière de phrase.
La graine reproduit la partition pour les mêmes paramètres et leur même histoire,
pas un fichier binaire identique entre tous les navigateurs.

## Réglages

Densité : probabilités et occupation des voix. Énergie : tempo, vélocité et
percussion. Tension : extensions harmoniques, FM et feedback. Luminosité : filtre,
FM et apparitions des cloches. Fluidité : microtiming, durée des notes et tempo.
Profondeur : convolution, échos et panoramiques. Complexité : motifs et ornements.
Stabilité : durée harmonique, conduite mélodique et désaccordage discret.

« Rejouer cette graine » applique le champ édité et repart du début. « Faire
évoluer » enrichit progressivement les paramètres. Le choix d'autres emojis
réinitialise la composition vers leur famille sonore.

## WAV et hors ligne

Le WAV est un nouvel extrait de 30 secondes, stéréo PCM 16 bits / 32 kHz, depuis
la graine et les réglages actuels, avec fondu final. Ce n'est pas l'enregistrement
de la session en cours. La lecture est suspendue pendant le rendu puis reprise.
Le module permet des durées de 2 à 60 secondes pour borner la mémoire.

`build/offlinePlugin.js` produit un service worker à chaque build. Après une
première visite connectée et la fin de son installation, le code et les deux
textures sont disponibles hors ligne. Les MP3 historiques ne sont pas précachés.
Le service worker n'est pas enregistré sur le serveur Vite de développement.
HTTPS ou localhost est requis. Une éviction du cache par le navigateur impose
une nouvelle visite connectée.

## Vérifications

```sh
npm run build
npm run typecheck
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/procedural-music.spec.js tests/squibble.spec.js tests/local-texture.spec.js tests/squiggle-objects.spec.js
```

Test du cache de production, avec `npm run preview -- --port 4175 --strictPort`
dans un autre terminal :

```sh
TEST_OFFLINE=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/offline-music.spec.js
```

Les tests contrôlent la partition simulée sur 30 minutes, les six timbres et cinq
modes, le signal WAV non silencieux, les limites de niveau, les démarrages répétés,
le partage et la fermeture du contexte, ainsi que le retour hors ligne.
Une partition simulée n'est pas un test audio réel de 30 minutes. Une écoute
prolongée, la mesure CPU et le confort sur des téléphones physiques restent à
valider. Le limiteur protège le signal, pas le niveau d'écoute choisi sur l'appareil.

## Peinture en voyage

Les nuages ont été remplacés par `createLivingRibbons.js` : surfaces ouvertes
texturées, croissance le long de la trajectoire, durées de 18 à 40 secondes,
dissolution puis renouvellement à des phases décalées. Un seul mesh regroupe les
trajectoires procédurales, sans nouvelle géométrie par frame.

`createFlightBrushes.js` dépose un sillage à 1,8 m devant la caméra pendant le
voyage. Trois styles : Voile, Encre, Grains. Contemplation et pause interrompent
le dépôt sans créer de raccord au redémarrage. Les traces vivent jusqu'à
75 secondes ; un buffer circulaire plafonné à 2 200 segments sur mobile borne
la mémoire. Les photos incluent la peinture. Un retour à la bulle termine la
session de peinture en cours.
