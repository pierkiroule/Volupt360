import BrushSelector from "./BrushSelector.jsx";
import AudioTrack from "./AudioTrack.jsx";

export default function ControlPanel({
  brush,
  onBrush,
  textures,
  onTexture,
  ...audioProps
}) {
  return (
    <div className="composer">
      <BrushSelector
        selected={brush}
        onChange={onBrush}
        textures={textures}
        onTexture={onTexture}
      />
      <AudioTrack {...audioProps} />
    </div>
  );
}
