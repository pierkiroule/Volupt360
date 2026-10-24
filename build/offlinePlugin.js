import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
/** Cache the built application, never the MP3 archive or external requests. */
export function offlinePlugin() {
  let base = "/",
    publicDir = "public";
  return {
    name: "squibble-offline",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      base = config.base;
      publicDir = config.publicDir;
    },
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).filter((file) =>
        /\.(js|css|html)$/.test(file),
      );
      const textureFiles = [];
      const scan = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const path = join(dir, entry.name);
          if (entry.isDirectory()) scan(path);
          else if (/\.(png|jpe?g|webp|avif|json)$/i.test(entry.name))
            textureFiles.push(path);
        }
      };
      scan(resolve(publicDir, "textures"));
      textureFiles.sort();
      const textureHash = createHash("sha256");
      for (const path of textureFiles)
        textureHash
          .update(relative(publicDir, path))
          .update(readFileSync(path));
      const textureUrls = textureFiles.map(
        (path) => base + relative(publicDir, path).split("\\").join("/"),
      );
      const audioFiles = ["piano", "wood", "bow", "strings"].flatMap((name) =>
        ["low", "mid", "high"].map(
          (level) => `audio/emociel/${name}-${level}.ogg`,
        ),
      );
      audioFiles.push(
        ...["four", "broken", "air"].map((name) => `audio/electro/${name}.ogg`),
      );
      const audioHash = createHash("sha256");
      for (const path of audioFiles)
        audioHash.update(readFileSync(resolve(publicDir, path)));
      const version = createHash("sha256")
        .update(
          files.sort().join("|") +
            textureHash.digest("hex") +
            audioHash.digest("hex"),
        )
        .digest("hex")
        .slice(0, 12);
      const audioUrls = audioFiles.map((path) => base + path);
      const urls = [
        ...audioUrls,
        base,
        base + "index.html",
        ...files.map((file) => base + file),
      ];
      const source = `const CACHE="squibble-${version}";
const CORE=${JSON.stringify([...new Set(urls)])};
const TEXTURES=${JSON.stringify([...textureUrls, base + "favicon.svg"])};
self.addEventListener("install",event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);await cache.addAll(CORE);
 await Promise.allSettled(TEXTURES.filter(url=>url.endsWith("favicon.svg")).map(url=>cache.add(url)));await self.skipWaiting();
})()));
self.addEventListener("activate",event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith("squibble-")&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener("fetch",event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=="GET"||url.origin!==self.location.origin)return;
 if(event.request.mode==="navigate"){
 event.respondWith(fetch(event.request).catch(()=>caches.match(${JSON.stringify(base + "index.html")},{ignoreVary:true})));return;
 }
 if(!CORE.includes(url.pathname)&&!TEXTURES.includes(url.pathname))return;
 event.respondWith((async()=>{const cached=await caches.match(event.request,{ignoreVary:true});if(cached)return cached;const response=await fetch(event.request);if(response.ok){try{const cache=await caches.open(CACHE);await cache.put(event.request,response.clone());}catch{}}return response;})());
});`;
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}
