import { createHash } from "node:crypto";
/** Cache the built application, never the MP3 archive or external requests. */
export function offlinePlugin() {
  let base = "/";
  return {
    name: "squibble-offline",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      base = config.base;
    },
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).filter((file) =>
        /\.(js|css|html)$/.test(file),
      );
      const version = createHash("sha256")
        .update(files.sort().join("|"))
        .digest("hex")
        .slice(0, 12);
      const urls = [
        base,
        base + "index.html",
        ...files.map((file) => base + file),
      ];
      const source = `const CACHE="squibble-${version}";
const CORE=${JSON.stringify([...new Set(urls)])};
const TEXTURES=${JSON.stringify([base + "textures/Text1.png", base + "textures/rezo.png", base + "favicon.svg"])};
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
