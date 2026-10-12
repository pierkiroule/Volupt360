"""Offline French TTS assets. Requires espeakng-loader and ffmpeg, not runtime deps."""
import ctypes, json, pathlib, subprocess, tempfile, wave
import espeakng_loader

root = pathlib.Path(__file__).resolve().parents[1]
lib = espeakng_loader.load_library()
lib.espeak_Initialize.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_char_p, ctypes.c_int]
rate = lib.espeak_Initialize(1, 0, str(pathlib.Path(espeakng_loader.get_data_path()).parent).encode(), 0)
if rate <= 0:
    raise RuntimeError("French synthesizer unavailable")
chunks = []
CALLBACK = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.c_void_p)
@CALLBACK
def receive(samples, count, events):
    if samples and count:
        chunks.append(ctypes.string_at(samples, count * 2))
    return 0
lib.espeak_SetSynthCallback(receive)
if lib.espeak_SetVoiceByName(b"fr+f3"):
    raise RuntimeError("French voice unavailable")
lib.espeak_SetParameter(1, 140, 0)
lib.espeak_SetParameter(3, 46, 0)
lib.espeak_SetParameter(4, 35, 0)
lib.espeak_Synth.argtypes = [ctypes.c_char_p, ctypes.c_size_t, ctypes.c_uint, ctypes.c_int, ctypes.c_uint, ctypes.c_uint, ctypes.c_void_p, ctypes.c_void_p]
(root / "public/poems").mkdir(parents=True, exist_ok=True)
for id, text, word in json.loads((root / "src/sonoizo/poems.json").read_text()):
    chunks.clear()
    encoded = text.encode()
    lib.espeak_Synth(encoded, len(encoded) + 1, 0, 1, 0, 1, None, None)
    lib.espeak_Synchronize()
    pcm = b"".join(chunks)
    duration = len(pcm) / 2 / rate
    if duration > 5:
        raise RuntimeError(f"{id} exceeds five seconds: {duration}")
    with tempfile.NamedTemporaryFile(suffix=".wav") as file:
        with wave.open(file.name, "wb") as wav:
            wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(rate); wav.writeframes(pcm)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", file.name, "-ar", "24000", "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "48k", str(root / f"public/poems/{id}.mp3")], check=True)
    print(id, round(duration, 2), flush=True)
lib.espeak_Terminate()
