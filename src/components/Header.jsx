export default function Header({ sonoizo = false }) {
  return (
    <header className="brand">
      <h1>
        {sonoizo ? "L’Oizodio" : "NID SONORE"}
        <span>•°</span>
      </h1>
      <p className={sonoizo ? "sonoizo-tagline" : undefined}>
        {sonoizo
          ? "Le chant qui sculpte l’espace des possibles"
          : "Paysages d’aquarelle · habiter le son"}
      </p>
    </header>
  );
}
