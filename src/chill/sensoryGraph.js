export const MAX_SENSORY_NODES = 48;
export const MAX_SENSORY_LINKS = 96;
export const emptySensoryGraph = () => ({
  kind: "sensory-network",
  nodes: [],
  links: [],
});
export const sensoryLinkKey = (a, b) => [a, b].sort().join(":");
export function clampSensoryPosition(point, size) {
  const x = point.u - 0.5,
    y = point.v - 0.5,
    distance = Math.hypot(x, y),
    limit = Math.max(0, 0.5 - size / 2);
  const scale = distance > limit ? limit / distance : 1;
  return { u: 0.5 + x * scale, v: 0.5 + y * scale };
}
/** Only deliberate contact during a drag toggles a pair, once per gesture. */
export function initialSensoryContacts(graph, id) {
  const node = graph.nodes.find((n) => n.id === id),
    contacts = new Set();
  if (!node) return contacts;
  for (const other of graph.nodes) {
    if (
      other.id !== id &&
      Math.hypot(node.u - other.u, node.v - other.v) <=
        (node.size + other.size) * 0.46
    )
      contacts.add(sensoryLinkKey(id, other.id));
  }
  return contacts;
}
export function moveSensoryNode(graph, id, point, contacts = new Set()) {
  const node = graph.nodes.find((n) => n.id === id);
  if (!node) return graph;
  const moved = { ...node, ...clampSensoryPosition(point, node.size) };
  const links = [...graph.links];
  for (const other of graph.nodes) {
    if (other.id === id) continue;
    if (
      Math.hypot(moved.u - other.u, moved.v - other.v) >
      (moved.size + other.size) * 0.46
    )
      continue;
    const key = sensoryLinkKey(id, other.id);
    if (contacts.has(key)) continue;
    contacts.add(key);
    const index = links.findIndex((l) => l.id === key);
    if (index >= 0) links.splice(index, 1);
    else if (links.length < MAX_SENSORY_LINKS)
      links.push({ id: key, a: id, b: other.id });
  }
  return {
    ...graph,
    nodes: graph.nodes.map((n) => (n.id === id ? moved : n)),
    links,
  };
}
export function addSensoryNode(graph, node, contacts = new Set()) {
  if (graph.nodes.length >= MAX_SENSORY_NODES) return graph;
  const created = { ...node, ...clampSensoryPosition(node, node.size) };
  return moveSensoryNode(
    { ...graph, nodes: [...graph.nodes, created] },
    node.id,
    created,
    contacts,
  );
}
export function removeSensoryNode(graph, id) {
  return {
    ...graph,
    nodes: graph.nodes.filter((n) => n.id !== id),
    links: graph.links.filter((l) => l.a !== id && l.b !== id),
  };
}
