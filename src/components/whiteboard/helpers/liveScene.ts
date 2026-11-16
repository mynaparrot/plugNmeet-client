import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

/**
 * The Excalidraw API of the mounted whiteboard, or null when the board is
 * closed. Lets code outside the whiteboard (drawing tools, snapshot capture)
 * reach the live scene without importing the component tree.
 */
let excalidrawAPI: ExcalidrawImperativeAPI | null = null;

export const getWhiteboardExcalidrawAPI = (): ExcalidrawImperativeAPI | null => excalidrawAPI;

/** Called by the whiteboard when the API is ready and again on unmount. */
export const setWhiteboardExcalidrawAPI = (api: ExcalidrawImperativeAPI | null) => {
  excalidrawAPI = api;
};
