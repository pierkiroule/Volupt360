export default function Header({ sonoizo = false }) {
  return (
    <header className="brand">
      <h1>
        {sonoizo ? "echohypnosis" : "NID SONORE"}
        {!sonoizo && <span>•°</span>}
      </h1>
      <p className={sonoizo ? "sonoizo-tagline" : undefined}>
        {sonoizo
          ? "L’Oizo échohypnotique"
          : "Paysages d’aquarelle · habiter le son"}
      </p>
    </header>
  );
}
