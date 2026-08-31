import {
  DB_STORE_NAMES,
  idbGet,
  idbGetAllKeys,
  idbStore,
} from '../../../helpers/libs/idb';

/**
 * Export-cache helpers.
 *
 * These read/write whiteboard page snapshots in IndexedDB for PDF export only.
 * They are intentionally NOT a sync source: live sync uses the server snapshot
 * (presenter) and peer Yjs deltas.
 */
export const saveWhiteboardPageSnapshot = (
  fileId: string,
  page: number,
  update: Uint8Array,
) => idbStore(DB_STORE_NAMES.WHITEBOARD, `${fileId}_${page}`, update);

export const loadWhiteboardPageSnapshot = async (
  fileId: string,
  page: number,
): Promise<Uint8Array | undefined> => {
  const value = await idbGet<Uint8Array>(
    DB_STORE_NAMES.WHITEBOARD,
    `${fileId}_${page}`,
  );
  return value instanceof Uint8Array ? value : undefined;
};

export const listWhiteboardPages = async (
  fileId: string,
): Promise<number[]> => {
  const keys = await idbGetAllKeys(DB_STORE_NAMES.WHITEBOARD);
  const prefix = `${fileId}_`;
  return keys
    .filter(
      (key): key is string => typeof key === 'string' && key.startsWith(prefix),
    )
    .map((key) => {
      // Strict parse: only accept a trailing pure-integer suffix so a key like
      // `${fileId}_3~d` (a rolling-diff key) can never be listed as a page.
      const suffix = key.slice(prefix.length);
      const page = Number.parseInt(suffix, 10);
      return Number.isInteger(page) && String(page) === suffix ? page : NaN;
    })
    .filter((page) => Number.isInteger(page))
    .sort((a, b) => a - b);
};

const WHITEBOARD_LAST_PAGE_PREFIX = 'lastPage_';

export const saveWhiteboardLastPage = (fileId: string, page: number) =>
  idbStore(
    DB_STORE_NAMES.WHITEBOARD,
    `${WHITEBOARD_LAST_PAGE_PREFIX}${fileId}`,
    page,
  );

export const loadWhiteboardLastPage = async (
  fileId: string,
): Promise<number | undefined> => {
  const value = await idbGet<number>(
    DB_STORE_NAMES.WHITEBOARD,
    `${WHITEBOARD_LAST_PAGE_PREFIX}${fileId}`,
  );
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : undefined;
};
