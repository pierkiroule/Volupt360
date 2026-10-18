// Editorial content is independent of rendering. "Resonance" is always a metaphor,
// never an explanation, diagnosis or promised therapeutic outcome.
const entries = [
  {
    id: "weight",
    title: "Peut-on se sentir plus léger sans perdre un gramme ?",
    mystery:
      "Une même main peut sembler lourde un jour, légère le lendemain. La balance aurait-elle manqué quelque chose ?",
    discovery:
      "Notre perception du corps combine vision, toucher et proprioception. Les illusions corporelles montrent qu’elle peut changer sans modification du corps lui-même.",
    limit:
      "Ces expériences documentent la plasticité du corps perçu, pas une diminution de sa masse. « Se sentir léger » recouvre plusieurs sensations.",
    resonance:
      "Le nuage garde sa matière ; c’est peut-être notre façon de le regarder qui s’allège.",
    interaction:
      "Regardez les deux silhouettes : le contour se déplace, le noyau reste identique.",
    evidence: "Résultats expérimentaux et revue",
    citation:
      "Kilteni et al. (2015) — Over my fake body: body ownership illusions for studying the multisensory basis of own-body perception.",
    doi: "10.3389/fnhum.2015.00141",
    animation: "body",
    brush: "voiles",
    color: "#9fcad6",
  },
  {
    id: "burden",
    title: "Pourquoi la souffrance psychique peut-elle alourdir le corps ?",
    mystery:
      "La fatigue et les tensions peuvent donner l’impression de porter un poids invisible. Comment une expérience psychique devient-elle corporelle ?",
    discovery:
      "L’interoception participe à la perception des signaux internes. Dans l’anxiété et la dépression, leur traitement peut être modifié, avec des sensations corporelles parfois pesantes.",
    limit:
      "Les liens sont complexes et variables. Une lourdeur corporelle n’indique pas à elle seule un trouble psychique ; elle peut aussi avoir des causes physiques.",
    resonance:
      "Dans ce ciel, les pigments se rassemblent et se dispersent sans qu’une couleur explique l’autre.",
    interaction:
      "En déplaçant le regard, voyez les grains se regrouper puis se redistribuer.",
    evidence: "Synthèse et modèle explicatif",
    citation:
      "Paulus & Stein (2010) — Interoception in anxiety and depression.",
    doi: "10.1007/s00429-010-0258-9",
    animation: "grains",
    brush: "falaises",
    color: "#b8a4cb",
  },
  {
    id: "sigh",
    title: "Pourquoi un soupir procure-t-il parfois du soulagement ?",
    mystery:
      "Une grande inspiration, puis une expiration… Le soupir change-t-il seulement l’air dans nos poumons ?",
    discovery:
      "Le soupir contribue à la mécanique respiratoire. Dans un essai, une pratique quotidienne de respiration incluant des doubles inspirations et des expirations prolongées a amélioré l’affect positif.",
    limit:
      "Cette pratique répétée n’est pas un soupir spontané isolé. Un soulagement immédiat n’est ni systématique ni une preuve d’efficacité thérapeutique.",
    resonance:
      "Un voile s’ouvre, se déplie et retrouve sa forme : une image du passage de l’air.",
    interaction:
      "Le voile suit doucement le regard. Aucune synchronisation de votre respiration n’est nécessaire.",
    evidence: "Essai contrôlé, pratique de cinq minutes par jour",
    citation:
      "Balban et al. (2023) — Brief structured respiration practices enhance mood and reduce physiological arousal.",
    doi: "10.1016/j.xcrm.2022.100895",
    animation: "breath",
    brush: "dilution",
    color: "#9cc7be",
  },
  {
    id: "flight",
    title: "Peut-on avoir l’impression de voler sans bouger ?",
    mystery:
      "Vous êtes immobile, pourtant un paysage mobile peut donner l’impression de partir avec lui. Qui se déplace ?",
    discovery:
      "Le sentiment de position et de mouvement de soi résulte d’intégrations visuelles, vestibulaires et somatosensorielles. Des conflits entre ces signaux peuvent modifier cette expérience.",
    limit:
      "Les illusions de mouvement sont variables. Elles ne prouvent ni déplacement réel ni séparation du corps ; elles peuvent aussi provoquer un inconfort.",
    resonance:
      "Les repères passent dans le ciel ; le centre de votre regard reste ici.",
    interaction:
      "Tournez lentement le regard parmi les repères. Vous pouvez quitter la bulle à tout moment.",
    evidence: "Revue des mécanismes multisensoriels",
    citation:
      "Blanke (2012) — Multisensory brain mechanisms of bodily self-consciousness.",
    doi: "10.1038/nrn3292",
    animation: "flow",
    brush: "filamentslibres",
    color: "#a4bfde",
  },
  {
    id: "imagery",
    title:
      "Pourquoi l’imagination peut-elle susciter des sensations corporelles ?",
    mystery:
      "Évoquer un citron peut parfois faire saliver. Comment une image absente devient-elle une expérience présente ?",
    discovery:
      "L’imagerie mentale mobilise en partie des mécanismes perceptifs. Selon la tâche et la personne, imaginer peut accompagner des réponses sensorielles ou physiologiques.",
    limit:
      "L’imagerie n’est pas identique à la perception. Sa vivacité varie fortement ; ne rien visualiser n’est pas un échec.",
    resonance:
      "Une forme esquissée suffit parfois à laisser entrevoir tout un paysage.",
    interaction:
      "Le dessin se complète là où se pose votre regard, puis redevient esquisse.",
    evidence: "Revue cognitive et neuroscientifique",
    citation:
      "Pearson et al. (2015) — Mental Imagery: Functional Mechanisms and Clinical Applications.",
    doi: "10.1016/j.tics.2015.08.003",
    animation: "outline",
    brush: "calligraphie",
    color: "#d5b4c5",
  },
  {
    id: "dream",
    title: "Pourquoi rêvons-nous parfois de voler ?",
    mystery:
      "Dans un rêve, voler paraît parfois évident. Au réveil, cette évidence s’évanouit. Que sait-on de ces voyages ?",
    discovery:
      "Les rêves associent des expériences perceptives et émotionnelles à une activité cérébrale pendant le sommeil. Leur contenu peut mêler souvenirs et situations impossibles.",
    limit:
      "Il n’existe pas de signification scientifique universelle du rêve de vol. Continuité avec la vie éveillée et construction imaginative restent des pistes, pas un décryptage individuel.",
    resonance:
      "Des fragments de ciel composent un chemin que personne n’avait dessiné à l’avance.",
    interaction:
      "Le regard rapproche des fragments ; leur assemblage reste changeant.",
    evidence: "Revue ; explications du contenu encore discutées",
    citation:
      "Nir & Tononi (2010) — Dreaming and the brain: from phenomenology to neurophysiology.",
    doi: "10.1016/j.tics.2009.12.001",
    animation: "dream",
    brush: "echo",
    color: "#c4afe0",
  },
  {
    id: "balance",
    title: "Pourquoi la légèreté peut-elle provoquer le vertige ?",
    mystery:
      "Quand les repères deviennent incertains, flotter peut sembler agréable… ou déstabilisant. Qu’est-ce qui nous oriente ?",
    discovery:
      "L’équilibre utilise des informations visuelles, vestibulaires et proprioceptives, dont le poids relatif s’adapte. Des discordances peuvent contribuer à une instabilité ressentie.",
    limit:
      "« Vertige » et étourdissement ne désignent pas toujours le même phénomène. La sensation de légèreté n’est pas une cause unique ; un vertige persistant mérite un avis médical.",
    resonance: "Un fil discret donne un repère, sans enfermer tout l’horizon.",
    interaction:
      "Un horizon stable accompagne les points mobiles. Aucun effet de roulis n’est imposé.",
    evidence: "Étude expérimentale du contrôle postural",
    citation:
      "Peterka (2002) — Sensorimotor integration in human postural control.",
    doi: "10.1152/jn.2002.88.3.1097",
    animation: "horizon",
    brush: "aurore",
    color: "#9ac7c9",
  },
  {
    id: "control",
    title: "Pourquoi vouloir lâcher prise peut-il renforcer le contrôle ?",
    mystery:
      "Essayer de ne pas penser à une chose peut la rendre plus présente. Pourquoi cette consigne se retourne-t-elle parfois ?",
    discovery:
      "La théorie des processus ironiques propose qu’en surveillant l’absence d’une pensée, on la maintienne accessible. Cet effet dépend notamment de la charge cognitive et du contexte.",
    limit:
      "C’est un modèle de certains effets de suppression mentale, pas une loi générale du « lâcher-prise ». Les résultats ne prescrivent pas d’abandonner tout contrôle.",
    resonance: "Un cercle peut rester ouvert sans avoir besoin de disparaître.",
    interaction:
      "Le regard ouvre un passage dans les cercles : aucune cible à réussir.",
    evidence: "Modèle théorique et résultats expérimentaux",
    citation: "Wegner (1994) — Ironic processes of mental control.",
    doi: "10.1037/0033-295X.101.1.34",
    animation: "rings",
    brush: "bulles",
    color: "#d4b9a1",
  },
  {
    id: "hypnosis",
    title:
      "Comment un bras peut-il sembler se soulever tout seul sous hypnose ?",
    mystery:
      "Un mouvement peut être vécu comme spontané, alors que le bras reste bien le sien. Comment distinguer action et sentiment d’agir ?",
    discovery:
      "Une suggestion hypnotique peut modifier l’expérience subjective d’un mouvement et de son caractère volontaire. La réponse varie beaucoup entre individus et selon le contexte.",
    limit:
      "Les mécanismes restent débattus. Une lévitation ressentie ne prouve pas une force extérieure ni une perte générale de contrôle. Cette animation ne constitue pas une séance d’hypnose.",
    resonance:
      "Le ruban se soulève ; sa matière ne cesse pas pour autant de lui appartenir.",
    interaction:
      "Un regard vers le haut soulève le ruban illustratif, sans consigne adressée à votre bras.",
    evidence: "Revue ; mécanismes et modèles discutés",
    citation:
      "Oakley & Halligan (2013) — Hypnotic suggestion: opportunities for cognitive neuroscience.",
    doi: "10.1038/nrn3538",
    animation: "ribbon",
    brush: "corolles",
    color: "#c3d0ae",
  },
  {
    id: "attention",
    title: "Comment l’attention transforme-t-elle nos sensations ?",
    mystery:
      "Un détail jusque-là discret peut remplir notre expérience dès qu’on l’observe. A-t-il changé, ou notre attention ?",
    discovery:
      "L’attention peut moduler certaines perceptions. Dans une étude d’imagerie, une tâche de distraction a réduit la douleur rapportée et modifié l’activité de réseaux impliqués dans son traitement.",
    limit:
      "Cet effet expérimental ne rend pas la douleur imaginaire et ne garantit pas qu’on puisse la faire disparaître par volonté.",
    resonance:
      "Un même pigment peut devenir détail, puis paysage, selon l’espace qu’on lui laisse.",
    interaction:
      "Le détail regardé gagne en précision ; les autres restent présents.",
    evidence: "Étude expérimentale en imagerie cérébrale",
    citation:
      "Bantick et al. (2002) — Imaging how attention modulates pain in humans using functional MRI.",
    doi: "10.1093/brain/awf022",
    animation: "focus",
    brush: "hachures",
    color: "#aac4da",
  },
  {
    id: "awe",
    title: "Pourquoi l’émerveillement change-t-il notre perspective ?",
    mystery:
      "Devant un ciel immense, nos préoccupations paraissent parfois occuper une autre place. Que mesure la recherche ?",
    discovery:
      "Des études relient l’émerveillement à un sentiment de soi moins central et, dans certaines tâches, à davantage de comportements prosociaux.",
    limit:
      "Ces résultats dépendent des situations et des mesures. L’émerveillement n’est pas toujours agréable et ne garantit ni changement durable ni bénéfice clinique.",
    resonance: "Le détail et l’immensité peuvent appartenir au même ciel.",
    interaction:
      "En regardant autour de vous, découvrez un motif à plusieurs échelles.",
    evidence: "Ensemble d’études expérimentales et corrélationnelles",
    citation:
      "Piff et al. (2015) — Awe, the small self, and prosocial behavior.",
    doi: "10.1037/pspi0000018",
    animation: "scales",
    brush: "network",
    color: "#d1b7d8",
  },
  {
    id: "freedom",
    title: "Peut-on se sentir libre sans chercher à s’envoler ?",
    mystery:
      "La liberté se mesure-t-elle à la distance parcourue, ou aussi à la façon de choisir son prochain geste ?",
    discovery:
      "Dans la théorie de l’autodétermination, l’autonomie désigne l’expérience d’agir avec un sentiment de choix et d’adhésion. Elle ne se confond pas avec l’indépendance ou l’absence de contraintes.",
    limit:
      "C’est un cadre théorique étayé par des recherches, pas une définition unique de la liberté. L’expérience varie selon les contextes et les personnes.",
    resonance:
      "Plusieurs chemins restent visibles. Aucun n’a besoin d’être le bon pour tout le monde.",
    interaction:
      "Votre regard infléchit plusieurs lignes ouvertes, sans arrivée obligatoire.",
    evidence: "Cadre théorique et synthèse de recherches",
    citation:
      "Ryan & Deci (2000) — Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being.",
    doi: "10.1037/0003-066X.55.1.68",
    animation: "paths",
    brush: "lagons",
    color: "#d8c9a6",
  },
];
export const LEARNING_TOPICS = entries.map((topic, index) => ({
  ...topic,
  index,
  messages: [
    { label: "Mystère", kind: "Question", text: topic.mystery },
    {
      label: "Découverte scientifique",
      kind: topic.evidence,
      text: topic.discovery,
      nuance: topic.limit,
    },
    {
      label: "Résonance",
      kind: "Interprétation poétique",
      text: topic.resonance,
    },
  ],
}));
export const LEARNING_SECONDS = 15 * 60;
