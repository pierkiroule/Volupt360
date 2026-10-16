export default function Header({ sonoizo = false }) {
  return (
    <header className="brand">
      <h1>
        {sonoizo ? "ÉCHO & HYPNOS •°" : "NID SONORE"}
        {!sonoizo && <span>•°</span>}
      </h1>
      <p className={sonoizo ? "sonoizo-tagline" : undefined}>
        {sonoizo
          ? "Vos photos prennent forme"
          : "Paysages d’aquarelle · habiter le son"}
      </p>
    </header>
  );
}
