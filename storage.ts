import { Project, MediaAsset } from '../types/editor';

const DB_NAME = 'opencut_studio_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
        projectStore.createIndex('lastModified', 'lastModified', { unique: false });
      }

      if (!db.objectStoreNames.contains('media_assets')) {
        const assetStore = db.createObjectStore('media_assets', { keyPath: 'id' });
        assetStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    const request = store.put({ ...project, lastModified: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readonly');
    const store = tx.objectStore('projects');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllProjects(): Promise<Project[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readonly');
    const store = tx.objectStore('projects');
    const request = store.getAll();

    request.onsuccess = () => {
      const projects: Project[] = request.result || [];
      // Sort newest first
      projects.sort((a, b) => b.lastModified - a.lastModified);
      resolve(projects);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveMediaAsset(asset: MediaAsset): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('media_assets', 'readwrite');
    const store = tx.objectStore('media_assets');
    // Store asset without ephemeral URL, keeping Blob for persistence
    const toStore = { ...asset };
    const request = store.put(toStore);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllMediaAssets(): Promise<MediaAsset[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('media_assets', 'readonly');
    const store = tx.objectStore('media_assets');
    const request = store.getAll();

    request.onsuccess = () => {
      const assets: MediaAsset[] = request.result || [];
      // Re-create object URLs for Blobs if needed
      for (const asset of assets) {
        if (asset.blob) {
          asset.url = URL.createObjectURL(asset.blob);
        }
      }
      resolve(assets);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteMediaAsset(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('media_assets', 'readwrite');
    const store = tx.objectStore('media_assets');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function exportProjectToJSON(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function importProjectFromJSON(jsonStr: string): Project {
  const data = JSON.parse(jsonStr);
  if (!data.id || !Array.isArray(data.tracks) || !Array.isArray(data.clips)) {
    throw new Error('Invalid project file format.');
  }
  return {
    ...data,
    id: 'proj_' + Math.random().toString(36).substring(2, 9),
    name: `${data.name} (Imported)`,
    lastModified: Date.now()
  };
}
