> Archive : Strudel, son interface et sa dépendance ont été retirés. Cette page décrit une ancienne version.

# Musique de paysage — Strudel

Le bouton ♪ ouvre un lecteur discret : Écouter / Couper le son et volume. Aucun AudioContext n’est créé avant une activation volontaire. Le son suit la pause du voyage et les interruptions d’arrière-plan. Les changements de paysage passent par un fondu avant l’installation du nouveau motif.

## Composition

`musicComposition.ts` décrit cinq palettes harmoniques (forêt, montagne, désert, littoral, onirique). La graine choisit quatre variantes motiviques ; les notes suivent les accords courants. Les nappes, la basse et les cellules mélodiques partagent la même progression de 32 mesures, tandis qu’une percussion de bruit filtré et des omissions déterministes introduisent des respirations. L’ambiance nocturne ralentit et assombrit le timbre ; la densité du paysage modifie les silences.

Les voix utilisent les oscillateurs triangle/sinus et le bruit brun de Strudel/Superdough. Aucun sample ou instrument distant n’est téléchargé. Ces timbres sont synthétisés ; ils ne sont pas présentés comme des enregistrements acoustiques. Réverbération, delay filtré, panoramique stéréo et enveloppes lentes accompagnent les motifs. Le moteur n’évalue aucun texte fourni par l’utilisateur.

## Technique

- `StrudelMusicEngine.ts` possède l’unique contexte audio partagé et le transport Strudel. Le paquet `@strudel/web@1.3.0` est importé à l’activation ; son code est fractionné et peut être précaché par le service worker pour un démarrage hors ligne ultérieur.
- Le contexte est déverrouillé avant le chargement asynchrone du module. Les AudioWorklets sont embarqués dans le paquet ; aucun CDN de musique n’est utilisé.
- Polyphonie limitée à 24 voix, gain progressif, filtre passe-haut à 36 Hz, passe-bas à 4800 Hz et compression douce. Le volume garde une réserve de niveau.
- Pause : fondu, suspension du transport et du contexte. Arrêt : arrêt du transport, remise à zéro des effets et suspension. Démontage : déconnexion et fermeture du contexte.
- Les paramètres sont indépendants de React et du moteur Three.js. Les ressources de paysage et l’intégration Poly Haven ne sont pas modifiées par la musique.

`public/licenses/strudel.txt` contient la licence AGPL-3.0-or-later et les liens vers les sources de Strudel et de l’intégration. Le panneau musical donne accès à ces informations.

## Validation exécutée

Build TypeScript/Vite. Tests de reproductibilité et de palettes distinctes ; démarrage volontaire, signal audio non nul mesuré par AnalyserNode, volume zéro, changement de biome pendant la lecture, pause/reprise, arrêt/redémarrage sur un seul contexte et nettoyage. Les contrôles graphiques du compositeur restent exécutables.

Un test de production séparé (`tests/strudel-music-offline.spec.js`) vérifie le démarrage après précache puis rechargement hors ligne. Exécution avec une prévisualisation de production :

```sh
LANDSCAPE_PROD_URL=http://127.0.0.1:4176 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/strudel-music-offline.spec.js
```

Les mesures d’analyseur ne constituent pas une écoute critique sur haut-parleur réel. Une écoute et une validation sur Chrome Android restent nécessaires ; aucun test de lecture de 30 minutes ni profil mémoire prolongé n’est déclaré réalisé.
