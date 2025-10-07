import { RefObject, useEffect } from 'react';
import {
  AppState,
  ExcalidrawImperativeAPI,
} from '@excalidraw/excalidraw/types';
import { Theme } from '@excalidraw/excalidraw/element/types';

import { useAppSelector } from '../../../../store';

interface IUseWhiteboardAppStateSync {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  isFollowing: boolean;
  isProgrammaticScroll: RefObject<boolean>;
}

const useWhiteboardAppStateSync = ({
  excalidrawAPI,
  isFollowing,
  isProgrammaticScroll,
}: IUseWhiteboardAppStateSync) => {
  const whiteboardAppState = useAppSelector(
    (state) => state.whiteboard.whiteboardAppState,
  );

  // for handling AppState changes
  useEffect(() => {
    if (excalidrawAPI && whiteboardAppState && isFollowing) {
      // Receiver's current state from the API
      const receiverState = excalidrawAPI.getAppState();
      // Sender's state from Redux
      const senderState = whiteboardAppState;

      const appState: Partial<AppState> = {
        theme: senderState.theme as Theme,
        viewBackgroundColor: senderState.viewBackgroundColor,
        zenModeEnabled: senderState.zenModeEnabled,
        gridSize: senderState.gridSize ?? undefined,
      };

      // we calculate the new scroll position for the receiver
      // so that their viewport is centered on the same
      // scene coordinates as the sender's. This provides an intuitive "follow-me"
      // experience, ensuring both users are looking at the same focal point.
      const senderZoom = senderState.zoomValue;

      appState.zoom = { value: senderZoom };
      appState.scrollX =
        senderState.scrollX +
        (receiverState.width - senderState.width) / (2 * senderZoom);
      appState.scrollY =
        senderState.scrollY +
        (receiverState.height - senderState.height) / (2 * senderZoom);

      isProgrammaticScroll.current = true;
      excalidrawAPI.updateScene({ appState: appState as AppState });
      // Use a timeout to ensure the flag is reset after the onScrollChange event has fired.
      setTimeout(() => {
        if (isProgrammaticScroll) {
          isProgrammaticScroll.current = false;
        }
      }, 100);
    }
  }, [excalidrawAPI, whiteboardAppState, isFollowing, isProgrammaticScroll]);
};

export default useWhiteboardAppStateSync;
