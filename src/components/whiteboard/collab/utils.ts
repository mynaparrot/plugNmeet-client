import * as Y from 'yjs';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

export const WHITEBOARD_ELEMENTS_MAP = 'elements';

/**
 * Decode a persisted yjs state snapshot (as written by
 * `saveWhiteboardPageSnapshot`) back into the Excalidraw elements stored in
 * the `WHITEBOARD_ELEMENTS_MAP` map. Malformed snapshots yield an empty array
 * rather than throwing.
 */
export const decodeWhiteboardPageSnapshot = (
  update: Uint8Array,
): ExcalidrawElement[] => {
  const doc = new Y.Doc();
  try {
    Y.applyUpdate(doc, update);
  } catch (e) {
    console.error('[WhiteboardController] failed to decode page snapshot', e);
    return [];
  }
  const elementsMap = doc.getMap<string>(WHITEBOARD_ELEMENTS_MAP);
  const elements: ExcalidrawElement[] = [];
  elementsMap.forEach((serialized) => {
    try {
      elements.push(JSON.parse(serialized) as ExcalidrawElement);
    } catch {
      // skip malformed entries
    }
  });
  return elements;
};

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Returns true when `incoming` should replace `current` for the same element
 * id. Mirrors Excalidraw's reconciliation rule: higher `version` wins; on
 * equal version, the lower `versionNonce` wins.
 */
export const isIncomingNewer = (
  current: ExcalidrawElement,
  incoming: ExcalidrawElement,
): boolean => {
  if (incoming.version !== current.version) {
    return incoming.version > current.version;
  }
  return incoming.versionNonce < current.versionNonce;
};
