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
      textureHash.update(
        readFileSync(resolve(publicDir, "licenses/strudel.txt")),
      );
      const textureUrls = textureFiles.map(
        (path) => base + relative(publicDir, path).split("\\").join("/"),
      );
      const version = createHash("sha256")
        .update(files.sort().join("|") + textureHash.digest("hex"))
        .digest("hex")
        .slice(0, 12);
      const urls = [
        base,
        base + "index.html",
        ...files.map((file) => base + file),
      ];
      const source = `const CACHE="squibble-${version}";
const CORE=${JSON.stringify([...new Set(urls)])};
const TEXTURES=${JSON.stringify([...textureUrls, base + "favicon.svg", base + "licenses/strudel.txt"])};
self.addEventListener("install",event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);await cache.addAll(CORE);
 await Promise.allSettled(TEXTURES.map(url=>cache.add(url)));await self.skipWaiting();
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
 event.respondWith((async()=>{const cached=await caches.match(event.request,{ignoreVary:true});return cached||fetch(event.request);})());
});`;
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}
