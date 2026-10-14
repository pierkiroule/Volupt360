import AudioTrack from "./AudioTrack.jsx";

export default function ControlPanel(audioProps) {
  return (
    <div className="composer">
      <AudioTrack {...audioProps} />
    </div>
  );
}
