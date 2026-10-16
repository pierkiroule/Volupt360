// Offline transport fixtures only: never shipped or used as replacement birdsong.
export function observation(id, threatened = false, license = "cc-by") {
  return {
    id,
    taxon: {
      id,
      rank: "species",
      name: `Test species ${id}`,
      preferred_common_name: `Oiseau test ${id}`,
    },
    user: { login: "test-recordist" },
    sounds: [
      {
        id: id + 100,
        file_url: `https://static.inaturalist.org/sounds/${id}.wav`,
        license_code: license,
      },
    ],
    threatened,
  };
}
export function wav() {
  const rate = 24000,
    size = rate * 2,
    buffer = Buffer.alloc(44 + size);
  buffer.write("RIFF");
  buffer.writeUInt32LE(36 + size, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(size, 40);
  for (let i = 0; i < rate; i++)
    buffer.writeInt16LE(
      Math.sin((i / rate) * 2500 * Math.PI * 2) * 8000,
      44 + i * 2,
    );
  return buffer;
}
