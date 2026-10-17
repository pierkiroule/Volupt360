import { hashMood } from "./echoMoodEngine.js";

// Original texts. Affinities concern images and materials, never a diagnosis.
const texts = {
  water: `Je passe, et le passage me transforme.|L'eau ne possède aucun de ses reflets.|Ce qui me traverse dessine mes rives.|Une profondeur demeure sous chaque départ.|Je cherche ma forme dans ce qui s'écoule.|La vague revient sans reprendre sa vie.|Nous sommes des sources qui s'ignorent.|Tout rivage est une question ouverte.|Le courant emporte aussi mes certitudes.|J'habite un instant la peau de l'eau.|Rien ne retient la mer en moi.|Une goutte suffit à déplacer le ciel.|Mes contours apprennent à se défaire.|Je demeure autrement dans ce qui fuit.|Au fond du mouvement, un espace attend.|L'horizon boit lentement mon nom.`,
  growth: `Je grandis par ce que je laisse ouvert.|Une racine explore avant de savoir.|Ce qui germe n'a pas encore de nom.|La terre garde une place pour l'inconnu.|Je ne suis pas fini de naître.|Une branche hésite, et la forêt commence.|Le vivant invente ses propres détours.|Je porte des saisons qui ne sont pas les miennes.|Sous mes pas, d'autres vies font chemin.|La lumière arrive aussi par les fissures.|Tout commencement contient un peu de nuit.|Je pousse vers ce qui me manque.|L'avenir tient dans une nervure.|Une fleur ne connaît pas son image.|Il reste du possible sous l'écorce.|Mes racines voyagent sans partir.`,
  fire: `Je suis la chaleur d'un passage.|Ce qui s'éteint éclaire encore quelqu'un.|La flamme ne garde rien pour elle.|Une braise tient tête à l'oubli.|Je change de forme en donnant ma lumière.|Le feu révèle la fragilité des contours.|Quelque chose commence dans la cendre.|J'apprends à briller sans tout consumer.|Le soleil ne demande pas de témoin.|Ma présence tient dans cette chaleur.|L'instant brûle sans devenir éternel.|Nous échangeons des étincelles de temps.|Un reste de jour veille sous la peau.|Ce qui rayonne échappe à sa source.|Je ne peux garder la lumière qu'en l'offrant.|La cendre aussi appartient au vivant.`,
  night: `La nuit agrandit ce que je ne sais pas.|Je suis un peu de ciel qui s'interroge.|L'invisible n'est pas toujours une absence.|Une étoile me rejoint après sa disparition.|Le silence garde plusieurs profondeurs.|Je laisse une place à ce qui m'échappe.|Dans l'obscur, mes limites deviennent poreuses.|Le monde existe aussi hors de mon regard.|Je ne connais qu'une rive de moi-même.|La lune habite une lumière empruntée.|Nous avançons parmi des présences lointaines.|Ce qui manque dessine une constellation.|La nuit ne ferme pas toutes les portes.|Je suis ici, sous un passé de lumière.|Une ombre peut abriter un commencement.|Le ciel demeure plus vaste que ma question.`,
  air: `Je tiens au monde par un souffle.|L'espace commence où mon geste s'arrête.|Un envol n'efface pas la terre.|Je suis le détour que prend le vent.|L'air relie ce que le regard sépare.|Rien ne pèse dans le nom du ciel.|Je passe entre mes propres frontières.|Une plume mesure autrement la chute.|Le vide offre une place au mouvement.|Je peux appartenir sans me fixer.|Chaque élan emporte un peu d'hésitation.|L'oiseau ne possède pas son chemin.|Mon passage laisse de la place après lui.|Je change d'horizon sans changer de ciel.|La distance est aussi une manière de relier.|Le souffle me précède et me prolonge.`,
  memory: `Je suis fait de passages qui demeurent.|Le passé change quand je le retrouve.|Une trace ne raconte jamais tout.|Ce qui revient revient autrement.|Je reconnais un lieu qui n'existe plus.|L'oubli laisse aussi des empreintes.|Nous habitons des instants superposés.|Un écho cherche encore sa première voix.|Je garde ce que je ne peux retenir.|La fin d'un jour nourrit un autre regard.|Le temps traverse la matière de mes gestes.|Une absence a modifié le paysage.|Je suis le présent de plusieurs départs.|Rien ne revient exactement à sa place.|Dans chaque adieu persiste un peu d'espace.|Ce qui s'efface me laisse une autre forme.`,
  connection: `Je deviens au contact de ce qui diffère.|Entre nous, le monde change de forme.|Une rencontre déplace le centre.|Je suis aussi ce que j'accueille.|Nos distances dessinent un lieu commun.|Le lien existe sans fermer l'espace.|Je ne peux me voir depuis tous les regards.|Quelqu'un prolonge un geste que j'oublie.|La présence commence par une place offerte.|Nous partageons un ciel sans le diviser.|Ce qui nous sépare nous donne un bord.|Je reconnais l'autre sans finir de le connaître.|Un passage peut devenir une rencontre.|Nos silences n'ont pas besoin d'être identiques.|Je porte la trace de ce qui m'a touché.|Être ensemble laisse encore de l'inconnu.`,
  mineral: `Je change à une vitesse invisible.|La pierre garde le mouvement des siècles.|Sous l'immobile, le monde travaille.|Je suis un équilibre qui se transforme.|Le poids me rappelle une appartenance.|Une fissure ouvre l'histoire de la matière.|Rien n'est tout à fait sans passage.|La montagne fut un autre paysage.|Je m'appuie sur ce qui me dépasse.|La patience a plusieurs profondeurs.|Chaque grain contient une ancienne distance.|Le sol demeure un ciel retourné.|Ce qui résiste apprend aussi à céder.|Je prends forme sans devenir définitif.|La matière ne connaît pas nos frontières.|Dans le repos, une transformation continue.`,
};
export const POETIC_LIBRARY = Object.entries(texts).flatMap(([theme, text]) =>
  text.split("|").map((text, i) => ({ id: `${theme}-${i}`, theme, text })),
);
const affinities = {
  "🌊": ["water", "air"],
  "🌿": ["growth", "mineral"],
  "🔥": ["fire", "memory"],
  "🌙": ["night", "memory"],
  "☀️": ["fire", "growth"],
  "❄️": ["mineral", "night"],
  "🌸": ["growth", "connection"],
  "🍂": ["memory", "growth"],
  "🪶": ["air", "memory"],
  "🌀": ["air", "water"],
  "🫧": ["water", "air"],
  "🌈": ["connection", "fire"],
  "✨": ["night", "fire"],
  "🪨": ["mineral", "memory"],
  "🌧️": ["water", "memory"],
  "🌌": ["night", "air"],
  "🦋": ["growth", "air"],
  "🐚": ["water", "memory"],
  "🍄": ["growth", "night"],
  "🌾": ["growth", "air"],
  "💧": ["water", "growth"],
  "🎵": ["connection", "air"],
  "🕯️": ["fire", "night"],
  "🪸": ["water", "connection"],
  "💜": ["connection", "night"],
  "🧡": ["connection", "fire"],
  "💙": ["connection", "water"],
  "🤍": ["air", "mineral"],
};
export function selectPoeticFragments(mood) {
  const weights = {};
  for (const emoji of mood.emojis)
    (affinities[emoji] || ["air", "memory"]).forEach((theme, i) => {
      weights[theme] = (weights[theme] || 0) + (i === 0 ? 2 : 1);
    });
  const key = [...mood.emojis].sort().join("");
  const ranked = POETIC_LIBRARY.map((item) => ({
    ...item,
    score:
      (weights[item.theme] || 0) * 10 +
      (hashMood(`${key}:${mood.seed}:${item.id}`) % 10000) / 10000,
  })).sort((a, b) => b.score - a.score);
  const counts = {},
    selected = [];
  for (let i = 0; i < 24; i++) {
    const theme = Object.keys(weights)
      .filter((t) => (counts[t] || 0) < 12)
      .sort(
        (a, b) =>
          weights[b] / ((counts[b] || 0) + 1) -
          weights[a] / ((counts[a] || 0) + 1),
      )[0];
    const next = ranked.find(
      (item) => item.theme === theme && !selected.includes(item),
    );
    selected.push(next);
    counts[theme] = (counts[theme] || 0) + 1;
  }
  return selected
    .sort((a, b) => hashMood(`${key}:${a.id}`) - hashMood(`${key}:${b.id}`))
    .map(({ score, ...item }) => item);
}
