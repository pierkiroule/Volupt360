import BrushSelector from "./BrushSelector.jsx";
import AudioTrack from "./AudioTrack.jsx";

export default function ControlPanel({ brush, onBrush, ...audioProps }) {
  return (
    <div className="composer">
      <BrushSelector selected={brush} onChange={onBrush} />
      <AudioTrack {...audioProps} />
    </div>
  );
}
