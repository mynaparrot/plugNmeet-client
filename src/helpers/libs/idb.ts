import { deleteDB, IDBPDatabase, openDB } from 'idb';

export const DB_STORE_USER_SETTINGS = 'userSettings',
  DB_STORE_WHITEBOARD = 'whiteboard',
  DB_STORE_IMAGE_CACHE = 'imageCache',
  DB_STORE_CHAT_MESSAGES = 'chatMessages',
  DB_STORE_USER_NOTIFICATIONS = 'userNotifications',
  DB_STORE_SPEECH_TO_TEXT_FINAL_TEXTS = 'speechToTextFinalText';

const DB_STORE_METADATA = 'metadata';
// Databases older than this will be cleaned up on startup (6 hours).
const DB_MAX_AGE_MS = 6 * 60 * 60 * 1000;

class IDBManager {
  /**
   * A list of all object stores used in the application.
   * This centralized list ensures that all stores are created when the database is initialized.
   */
  private readonly ALL_STORES: string[] = [
    DB_STORE_USER_SETTINGS,
    DB_STORE_WHITEBOARD,
    DB_STORE_IMAGE_CACHE,
    DB_STORE_CHAT_MESSAGES,
    DB_STORE_USER_NOTIFICATIONS,
    DB_STORE_SPEECH_TO_TEXT_FINAL_TEXTS,
    DB_STORE_METADATA,
  ];
  private dbPromise: Promise<IDBPDatabase> | null = null;
  private dbName: string | null = null;

  /**
   * Initializes a session-specific database. This must be called once at the
   * beginning of a session before any other database operations are performed.
   * The database name is based on the provided room SID.
   * @param roomSid The session ID of the current room.
   */
  public init(roomSid: string, userId: string) {
    // If the database has already been initialized, do nothing.
    if (this.dbPromise) {
      return;
    }

    // Run cleanup for stale databases from previous sessions.
    // This is a non-blocking "fire and forget" operation.
    this.cleanupStaleDBs().then();

    // Use a stable name for persistence across reloads.
    this.dbName = `pnm-${roomSid}-${userId}`;
    this.dbPromise = openDB(this.dbName, 3, {
      upgrade: (db) => {
        // Create all necessary object stores if they don't already exist.
        for (const storeName of this.ALL_STORES) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        }
      },
    });

    // After connecting, update the 'lastAccessed' timestamp.
    this.dbPromise
      .then((db) => db.put(DB_STORE_METADATA, Date.now(), 'lastAccessed'))
      .catch((e) => console.error('Failed to update DB timestamp:', e));
  }

  /**
   * Saves a value to a specified object store in the current session's database.
   * @param storeName The name of the object store.
   * @param key The key for the value.
   * @param value The value to save.
   */
  public async store(storeName: string, key: string, value: any) {
    const db = await this.getDb();
    // Update the timestamp on every write to keep the DB "alive".
    const tx = db.transaction([storeName, DB_STORE_METADATA], 'readwrite');
    await Promise.all([
      tx.objectStore(storeName).put(value, key),
      tx.objectStore(DB_STORE_METADATA).put(Date.now(), 'lastAccessed'),
    ]);
    await tx.done;
  }

  /**
   * Retrieves a value from a specified object store in the current session's database.
   * @param storeName The name of the object store.
   * @param key The key of the value to retrieve.
   * @returns The value, or undefined if not found.
   */
  public async get<T>(storeName: string, key: string): Promise<T | undefined> {
    const db = await this.getDb();
    if (!db.objectStoreNames.contains(storeName)) {
      return undefined;
    }
    return db.get(storeName, key);
  }

  /**
   * Retrieves all values from a specified object store.
   * @param storeName The name of the object store.
   * @returns An array of all values in the store.
   */
  public async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDb();
    if (!db.objectStoreNames.contains(storeName)) {
      return [];
    }
    return db.getAll(storeName);
  }

  /**
   * Deletes the entire database for the current session.
   */
  public async deleteDB() {
    if (this.dbName) {
      // Ensure the current connection is closed before deleting.
      if (this.dbPromise) {
        const db = await this.dbPromise;
        db.close();
      }
      await deleteDB(this.dbName);
      this.dbPromise = null;
      this.dbName = null;
    }
  }

  /**
   * Returns the active database connection promise.
   * Throws an error if the database has not been initialized.
   */
  private getDb(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      throw new Error(
        'IndexedDB has not been initialized. Call initIDB() first.',
      );
    }
    return this.dbPromise;
  }

  /**
   * Scans for and deletes any old plugNmeet databases that don't match the current session.
   * This handles cases where the browser was closed without proper cleanup.
   */
  private async cleanupStaleDBs() {
    if (!('databases' in indexedDB)) {
      console.warn(
        'indexedDB.databases() is not supported; automatic cleanup of stale databases is disabled.',
      );
      return;
    }

    const allDBs = await indexedDB.databases();
    const now = Date.now();

    for (const dbInfo of allDBs) {
      if (dbInfo.name && dbInfo.name.startsWith('pnm-')) {
        try {
          // Briefly open the DB to check its lastAccessed timestamp.
          const db = await openDB(dbInfo.name, 3);
          const lastAccessed = await db.get(DB_STORE_METADATA, 'lastAccessed');
          db.close();

          if (
            typeof lastAccessed !== 'number' ||
            now - lastAccessed > DB_MAX_AGE_MS
          ) {
            console.log(`Deleting stale IndexedDB: ${dbInfo.name}`);
            await deleteDB(dbInfo.name);
          }
        } catch (e) {
          console.error(
            `Could not check or delete stale DB ${dbInfo.name}:`,
            e,
          );
        }
      }
    }
  }
}

// Create a single instance to be used as a singleton.
const idbManager = new IDBManager();

// Bind the public methods to the singleton instance.
const initIDB = idbManager.init.bind(idbManager);
const idbStore = idbManager.store.bind(idbManager);
const idbGet = idbManager.get.bind(idbManager);
const idbGetAll = idbManager.getAll.bind(idbManager);
const deleteRoomDB = idbManager.deleteDB.bind(idbManager);

export { initIDB, idbStore, idbGet, idbGetAll, deleteRoomDB };
