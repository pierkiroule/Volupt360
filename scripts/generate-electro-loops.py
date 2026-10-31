import numpy as np, subprocess, pathlib, json, tempfile
sr=32000;bpm=104;beat=60/bpm;length=round(sr*beat*16);rng=np.random.default_rng(2610)
base=pathlib.Path(__file__).resolve().parents[1] / 'public/audio/electro'
base.mkdir(parents=True,exist_ok=True)
scratch=tempfile.TemporaryDirectory(prefix='emociel-electro-')
def hit(kind):
 duration={'kick':.45,'snare':.24,'hat':.1,'open':.24}[kind];t=np.arange(int(sr*duration))/sr
 noise=rng.normal(0,1,len(t));soft=np.convolve(noise,np.ones(4)/4,mode='same')
 if kind=='kick':
  freq=48+100*np.exp(-t*45);phase=2*np.pi*np.cumsum(freq)/sr;wave=np.sin(phase)*np.exp(-t*10)*.65+soft*np.exp(-t*110)*.035
 elif kind=='snare':wave=(noise-soft)*np.exp(-t*24)*.09+np.sin(2*np.pi*180*t)*np.exp(-t*30)*.08
 else:wave=(noise-soft)*np.exp(-t*(65 if kind=='hat' else 25))*(.035 if kind=='hat' else .028)
 return wave*np.minimum(1,t/.0015)
for style in ['four','broken','air']:
 wave=np.zeros(length)
 def place(kind,step,gain=1):
  sample=hit(kind)*gain;idx=(round(step*beat/4*sr)+np.arange(len(sample)))%length;np.add.at(wave,idx,sample)
 for bar in range(4):
  kick={'four':[0,4,8,12],'broken':[0,6,8,11],'air':[0,10]}[style]
  for step in kick:place('kick',bar*16+step,.8 if style=='air' else 1)
  for step in ([4,12] if style!='air' else [8]):place('snare',bar*16+step,.8 if bar%2==0 else 1)
  for step in range(0,16,2):place('hat',bar*16+step+(.15 if step%4==2 else 0),.6 if step%4==0 else 1)
  if style!='air':place('open',bar*16+14,.7)
  if bar==3:place('snare',bar*16+15,.35)
 raw=pathlib.Path(scratch.name)/(style+'.f32');raw.write_bytes(wave.astype('float32').tobytes())
 subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(sr),'-ac','1','-i',str(raw),'-c:a','libvorbis','-q:a','4',str(base/(style+'.ogg'))],check=True)
 print(style,len(wave)/sr,(base/(style+'.ogg')).stat().st_size,flush=True)
(base/'README.md').write_text('Original procedural drum loops composed for ÉmoCiel. 104 BPM, four bars, mono 32 kHz Vorbis. Kick, snare and hats synthesized locally; no third-party sample. Released under CC0-1.0. Seam tails wrapped into the next cycle. Not recordings of acoustic drums.\n')
(base/'loops.json').write_text(json.dumps({'bpm':104,'beats':16,'sampleRate':sr,'frames':length,'license':'CC0-1.0','files':['four.ogg','broken.ogg','air.ogg']},indent=2))

scratch.cleanup()
