import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { BIOME_RULES } from "./BiomeComposer";
import type { Biome } from "./types";
const API = "https://api.polyhaven.com",
  BYTE_LIMIT = 18 * 1024 * 1024,
  CACHE = "landscape-polyhaven-v1";
export interface FileEntry {
  url: string;
  path: string;
  size: number;
}
export interface ModelAsset {
  id: string;
  name: string;
  kind: "tree" | "rock";
  scene: THREE.Group;
  dispose: () => void;
}
export function allowedAssetURL(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      (u.hostname === "polyhaven.com" ||
        u.hostname.endsWith(".polyhaven.com") ||
        u.hostname === "polyhaven.org" ||
        u.hostname.endsWith(".polyhaven.org"))
    );
  } catch {
    return false;
  }
}
/** Inspect returned URLs, not guessed format/resolution paths. Unknown schemas yield no candidate. */
export function inspectFiles(
  value: unknown,
  path = "",
  depth = 0,
  output: FileEntry[] = [],
): FileEntry[] {
  if (depth > 12 || output.length > 500 || !value || typeof value !== "object")
    return output;
  if (!Array.isArray(value)) {
    const v = value as Record<string, unknown>;
    if (typeof v.url === "string" && allowedAssetURL(v.url))
      output.push({
        url: v.url,
        path,
        size: typeof v.size === "number" ? v.size : 0,
      });
    for (const [key, child] of Object.entries(v))
      if (child && typeof child === "object")
        inspectFiles(child, path + "/" + key, depth + 1, output);
  }
  return output;
}
function disposeScene(scene: THREE.Object3D) {
  const textures = new Set<THREE.Texture>(),
    materials = new Set<THREE.Material>(),
    geometries = new Set<THREE.BufferGeometry>();
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        materials.add(m);
        for (const value of Object.values(m))
          if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  for (const t of textures) {
    t.dispose();
    if (typeof t.image?.close === "function") t.image.close();
  }
  for (const m of materials) m.dispose();
  for (const g of geometries) g.dispose();
}
export class AssetLibrary {
  private controllers = new Set<AbortController>();
  private alive = true;
  private models: ModelAsset[] = [];
  private environments: THREE.DataTexture[] = [];
  async bytes(
    url: string,
    limit = BYTE_LIMIT,
    cached = true,
  ): Promise<ArrayBuffer> {
    if (!allowedAssetURL(url)) throw Error("Domaine de ressource non autorisé");
    let cache: Cache | undefined;
    try {
      if (cached && "caches" in globalThis) {
        cache = await caches.open(CACHE);
        const hit = await cache.match(url);
        if (hit) {
          const b = await hit.arrayBuffer();
          if (b.byteLength <= limit) return b;
          await cache.delete(url);
        }
      }
    } catch {
      /* Cache unavailable: network remains optional. */
    }
    const controller = new AbortController();
    if (!this.alive) throw Error("Chargement fermé");
    this.controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw Error("HTTP " + response.status);
      if (Number(response.headers.get("content-length")) > limit)
        throw Error("Ressource trop lourde");
      const reader = response.body?.getReader();
      let data: ArrayBuffer;
      if (reader) {
        const chunks: Uint8Array[] = [];
        let length = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > limit) {
            await reader.cancel();
            throw Error("Budget de téléchargement dépassé");
          }
          chunks.push(value);
        }
        const merged = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        data = merged.buffer;
      } else data = await response.arrayBuffer();
      if (data.byteLength > limit) throw Error("Ressource trop lourde");
      if (cache && this.alive) {
        try {
          await cache.put(
            url,
            new Response(data, {
              headers: { "content-length": String(data.byteLength) },
            }),
          );
          const keys = [...(await cache.keys())].reverse();
          let total = 0;
          for (const key of keys) {
            const item = await cache.match(key);
            total += Number(item?.headers.get("content-length") || 0);
            if (total > 32 * 1024 * 1024 || keys.indexOf(key) >= 6)
              await cache.delete(key);
          }
        } catch {
          /* Quota must never break the scene. */
        }
      }
      return data;
    } finally {
      clearTimeout(timeout);
      this.controllers.delete(controller);
    }
  }
  async json(path: string) {
    const bytes = await this.bytes(API + path, 4 * 1024 * 1024, false);
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  }
  async loadModel(id: string, name = id): Promise<ModelAsset> {
    if (!/^[a-z0-9_-]+$/i.test(id)) throw Error("Identifiant non valide");
    await this.json("/info/" + id);
    const manifest = await this.json("/files/" + id),
      files = inspectFiles(manifest);
    const candidates = files
      .filter(
        (f) =>
          /\.(glb|gltf)$/i.test(new URL(f.url).pathname) &&
          f.size <= BYTE_LIMIT,
      )
      .sort((a, b) => (a.size || BYTE_LIMIT) - (b.size || BYTE_LIMIT));
    if (!candidates.length)
      throw Error("Aucun modèle compatible et léger déclaré");
    const main = candidates[0],
      objects: string[] = [];
    let data = await this.bytes(main.url),
      budget = data.byteLength;
    const loader = new GLTFLoader();
    try {
      if (/\.gltf$/i.test(new URL(main.url).pathname)) {
        const doc = JSON.parse(new TextDecoder().decode(data));
        if (
          doc.extensionsRequired?.some((x: string) =>
            ["KHR_draco_mesh_compression", "EXT_meshopt_compression"].includes(
              x,
            ),
          )
        )
          throw Error("Compression non prise en charge");
        const resources = [
          ...(Array.isArray(doc.buffers) ? doc.buffers : []),
          ...(Array.isArray(doc.images) ? doc.images : []),
        ];
        if (resources.length > 12) throw Error("Trop de dépendances");
        for (const item of resources) {
          if (typeof item.uri !== "string" || item.uri.startsWith("data:"))
            continue;
          const uri = decodeURIComponent(item.uri).replace(/^\.\//, "");
          const matches = files.filter(
            (f) =>
              f.path.endsWith("/" + uri) ||
              f.path.endsWith("/" + uri.split("/").pop()),
          );
          if (matches.length !== 1)
            throw Error("Dépendance non déclarée ou ambiguë : " + uri);
          const bytes = await this.bytes(matches[0].url, BYTE_LIMIT - budget);
          budget += bytes.byteLength;
          const object = URL.createObjectURL(new Blob([bytes]));
          objects.push(object);
          item.uri = object;
        }
        data = new TextEncoder().encode(JSON.stringify(doc)).buffer;
      }
      // All external dependencies must be declared above, including any embedded GLB URI.
      loader.manager.setURLModifier((url) => {
        if (url.startsWith("blob:") || url.startsWith("data:")) return url;
        throw Error("Dépendance externe non préparée");
      });
      const gltf = await loader.parseAsync(data, "");
      if (!this.alive) {
        disposeScene(gltf.scene);
        throw Error("Chargement fermé");
      }
      let vertices = 0,
        meshes = 0,
        textureBytes = 0;
      const seen = new Set<THREE.Texture>();
      gltf.scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          meshes++;
          vertices += o.geometry.attributes.position?.count || 0;
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            for (const v of Object.values(m))
              if (v instanceof THREE.Texture && !seen.has(v)) {
                seen.add(v);
                textureBytes +=
                  (v.image?.width || 0) * (v.image?.height || 0) * 4 * 1.34;
              }
        }
      });
      if (vertices > 120000 || meshes > 8 || textureBytes > 24 * 1024 * 1024) {
        disposeScene(gltf.scene);
        throw Error("Budget GPU du modèle dépassé");
      }
      const bounds = new THREE.Box3().setFromObject(gltf.scene),
        size = new THREE.Vector3(),
        center = new THREE.Vector3();
      bounds.getSize(size);
      bounds.getCenter(center);
      const extent = Math.max(size.x, size.y, size.z);
      if (!Number.isFinite(extent) || extent <= 0) {
        disposeScene(gltf.scene);
        throw Error("Géométrie invalide");
      }
      gltf.scene.position.sub(
        new THREE.Vector3(center.x, bounds.min.y, center.z),
      );
      const wrapper = new THREE.Group();
      wrapper.add(gltf.scene);
      wrapper.scale.setScalar(1 / extent);
      let disposed = false;
      const result = {
        id,
        name,
        kind: (/tree|pine|birch|oak|palm/i.test(id + " " + name)
          ? "tree"
          : "rock") as "tree" | "rock",
        scene: wrapper,
        dispose: () => {
          if (!disposed) {
            disposed = true;
            disposeScene(wrapper);
          }
        },
      };
      this.models.push(result);
      return result;
    } finally {
      for (const url of objects) URL.revokeObjectURL(url);
    }
  }
  async selectModel(biome: Biome, seed: number) {
    const catalog = await this.json("/assets?type=models");
    if (!catalog || Array.isArray(catalog) || typeof catalog !== "object")
      throw Error("Catalogue incompatible");
    const words = BIOME_RULES[biome].words;
    const candidates = Object.entries(catalog)
      .filter(([id, item]) => {
        if (!/^[a-z0-9_-]+$/i.test(id) || !item || typeof item !== "object")
          return false;
        const entry = item as Record<string, unknown>;
        return words.some((w) =>
          (
            id +
            " " +
            String(entry.name || "") +
            " " +
            JSON.stringify(entry.categories || [])
          )
            .toLowerCase()
            .includes(w),
        );
      })
      .sort(([a], [b]) => a.localeCompare(b));
    if (!candidates.length) throw Error("Aucun modèle adapté");
    for (let attempt = 0; attempt < Math.min(2, candidates.length); attempt++) {
      const [id, meta] =
        candidates[((seed >>> 0) + attempt) % candidates.length];
      try {
        return await this.loadModel(
          id,
          String((meta as Record<string, unknown>).name || id),
        );
      } catch (e) {
        if (!this.alive || attempt === 1) throw e;
      }
    }
    throw Error("Modèles indisponibles");
  }
  async loadEnvironment(seed: number, pinned?: string) {
    const catalog = await this.json("/assets?type=hdris");
    if (!catalog || typeof catalog !== "object" || Array.isArray(catalog))
      throw Error("Catalogue HDRI indisponible");
    const ids = Object.keys(catalog)
      .filter(
        (id) =>
          /^[a-z0-9_-]+$/i.test(id) &&
          /sky|field|meadow|forest|hill|sunset|park/i.test(id),
      )
      .sort();
    if (!ids.length) throw Error("Aucun environnement léger déclaré");
    const id = pinned || ids[(seed >>> 0) % ids.length],
      manifest = await this.json("/files/" + id);
    const files = inspectFiles(manifest)
      .filter(
        (f) =>
          /\.hdr$/i.test(new URL(f.url).pathname) && f.size <= 4 * 1024 * 1024,
      )
      .sort((a, b) => (a.size || Infinity) - (b.size || Infinity));
    if (!files.length) throw Error("HDRI compatible indisponible");
    const data = new RGBELoader().parse(
      await this.bytes(files[0].url, 4 * 1024 * 1024),
    );
    if (!data || data.width > 1024 || data.height > 512 || !this.alive)
      throw Error("HDRI hors budget");
    const texture = new THREE.DataTexture(
      data.data.slice(),
      data.width,
      data.height,
      THREE.RGBAFormat,
      data.type,
    );
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.needsUpdate = true;
    this.environments.push(texture);
    return { id, texture };
  }
  dispose() {
    this.alive = false;
    for (const c of this.controllers) c.abort();
    this.controllers.clear();
    for (const m of this.models) m.dispose();
    this.models = [];
    for (const texture of this.environments) texture.dispose();
    this.environments = [];
  }
}
