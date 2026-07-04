import { RefObject, useEffect } from 'react';
import {
  AppState,
  ExcalidrawImperativeAPI,
  NormalizedZoomValue,
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

      // We calculate raw ratios first to evaluate the physical size difference.
      const rawWidthRatio = receiverState.width / senderState.width;
      const rawHeightRatio = receiverState.height / senderState.height;

      // We define a threshold (e.g. 90% of sender size). If the receiver's screen is
      // significantly smaller (like a mobile/tablet), we apply safety padding to keep
      // elements from hugging the viewport edges. Otherwise, we scale 1:1.
      const scaleThreshold = 0.9;
      const padding = 16;

      const widthScale =
        rawWidthRatio < scaleThreshold
          ? (receiverState.width - padding * 2) / senderState.width
          : Math.min(1, rawWidthRatio);

      const heightScale =
        rawHeightRatio < scaleThreshold
          ? (receiverState.height - padding * 2) / senderState.height
          : Math.min(1, rawHeightRatio);

      const responsiveMultiplier = Math.min(widthScale, heightScale, 1);
      const adjustedZoom = senderState.zoomValue * responsiveMultiplier;

      appState.zoom = { value: adjustedZoom as NormalizedZoomValue };
      appState.scrollX =
        senderState.scrollX +
        (receiverState.width - senderState.width * responsiveMultiplier) /
          (2 * adjustedZoom);
      appState.scrollY =
        senderState.scrollY +
        (receiverState.height - senderState.height * responsiveMultiplier) /
          (2 * adjustedZoom);

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
