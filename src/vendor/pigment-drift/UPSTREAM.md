# Pigment Drift Paint Studio

Source: https://github.com/ossianravn/pigment-drift-generator
Revision: 61d3cf57d5273105d7b9985973e4648d7a553c83
License: MIT, copyright (c) 2026 ossianravn and Pigment Drift contributors.

Vendored files: paint/engine.ts, paint/shaders.ts, paint/noise.ts, engine/color.ts,
engine/params.ts. No Studio UI or external dependencies are included.

Local changes to paint/engine.ts:
- Pressure solver iterations configurable: 6 desktop / 4 mobile, instead of 18.
- preserveDrawingBuffer enabled for the small shared canvas texture.
- Retain and delete the fullscreen vertex buffer on disposal.

Integration: src/simple/PigmentMusic.ts. The original MIT notice is retained here
and distributed in public/licenses/pigment-drift-MIT.txt.
