import { type Project, validateProject } from "./model";
let pending: Promise<IDBDatabase> | undefined;
function database() {
  return (pending ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("squiggle360-studio", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("projects", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(Error("Le stockage local est bloqué. Exportez le projet JSON."));
  }).catch((e) => {
    pending = undefined;
    throw e;
  }));
}
export const ProjectStore = {
  async save(project: Project) {
    const db = await database();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction("projects", "readwrite");
      tx.objectStore("projects").put(project);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || Error("Sauvegarde interrompue."));
    });
  },
  async list() {
    const db = await database();
    return new Promise<Project[]>((resolve, reject) => {
      const req = db.transaction("projects").objectStore("projects").getAll();
      req.onsuccess = () => {
        const valid: Project[] = [];
        for (const entry of req.result) {
          try {
            valid.push(validateProject(entry));
          } catch {
            /* Preserve unsupported records in the database. */
          }
        }
        resolve(valid.sort((a, b) => b.updatedAt - a.updatedAt));
      };
      req.onerror = () => reject(req.error);
    });
  },
};
