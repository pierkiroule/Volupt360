import {
  PREDEFINED_TEXTURES,
  predefinedTexturePreview,
} from "../engine/predefinedTextures.js";

export default function TexturePalette({
  brush,
  selected,
  onSelect,
  disabled = false,
}) {
  return (
    <div
      className="texture-presets"
      role="group"
      aria-label={`Textures de ${brush}`}
    >
      {PREDEFINED_TEXTURES.map((preset) => (
        <button
          key={preset.id}
          type="button"
          disabled={disabled}
          title={preset.name}
          aria-label={`Texture ${preset.name} pour ${brush}`}
          aria-pressed={selected === preset.id}
          onClick={() => onSelect(preset.id)}
        >
          <img
            src={predefinedTexturePreview(preset.id)}
            alt=""
            aria-hidden="true"
          />
          <small>{preset.name}</small>
        </button>
      ))}
    </div>
  );
}
