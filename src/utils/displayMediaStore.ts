const DB_NAME = 'kabira-pos-display-media';
const DB_VERSION = 1;
const STORE_NAME = 'media';
const MEDIA_KEY = 'display2-primary';

export interface DisplayMediaRecord {
  key: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  updatedAt: string;
}

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open Display 2 media storage.'));
  });

export const saveDisplay2Media = async (file: File): Promise<DisplayMediaRecord> => {
  const db = await openDb();
  try {
    const record: DisplayMediaRecord = {
      key: MEDIA_KEY,
      blob: file,
      fileName: file.name,
      mimeType: file.type,
      updatedAt: new Date().toISOString(),
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Unable to save Display 2 media.'));
    });

    return record;
  } finally {
    db.close();
  }
};

export const getDisplay2Media = async (): Promise<DisplayMediaRecord | null> => {
  const db = await openDb();
  try {
    return await new Promise<DisplayMediaRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(MEDIA_KEY);
      req.onsuccess = () => resolve((req.result as DisplayMediaRecord | undefined) || null);
      req.onerror = () => reject(req.error || new Error('Unable to read Display 2 media.'));
    });
  } finally {
    db.close();
  }
};

export const removeDisplay2Media = async (): Promise<void> => {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(MEDIA_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Unable to remove Display 2 media.'));
    });
  } finally {
    db.close();
  }
};

export const createDisplay2MediaUrl = async (): Promise<{
  url: string;
  record: DisplayMediaRecord;
} | null> => {
  const record = await getDisplay2Media();
  if (!record) return null;
  return { url: URL.createObjectURL(record.blob), record };
};
