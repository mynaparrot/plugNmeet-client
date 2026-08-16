import {
  DB_STORE_NAMES,
  idbGet,
  idbGetAllKeys,
  idbStore,
} from '../../../helpers/libs/idb';

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
    .map((key) => Number.parseInt(key.slice(prefix.length), 10))
    .filter((page) => Number.isInteger(page))
    .sort((a, b) => a - b);
};
