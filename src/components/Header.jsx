export default function Header({ sonoizo = false }) {
  return (
    <header className="brand">
      <h1>
        {sonoizo ? "OIZO •°" : "NID SONORE"}
        {!sonoizo && <span>•°</span>}
      </h1>
      <p className={sonoizo ? "sonoizo-tagline" : undefined}>
        {sonoizo
          ? "ÉchoMood · matières en résonance"
          : "Paysages d’aquarelle · habiter le son"}
      </p>
    </header>
  );
}
