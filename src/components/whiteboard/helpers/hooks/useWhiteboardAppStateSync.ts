import { useEffect, useMemo } from 'react';
import {
  AppState,
  ExcalidrawImperativeAPI,
  NormalizedZoomValue,
} from '@excalidraw/excalidraw/types';
import { Theme } from '@excalidraw/excalidraw/element/types';
import { debounce } from 'es-toolkit';

import { useAppSelector } from '../../../../store';

const VIEWPORT_SYNC_DEBOUNCE_TIMEOUT = 150;

interface IUseWhiteboardAppStateSync {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  isFollowing: boolean;
}

const useWhiteboardAppStateSync = ({
  excalidrawAPI,
  isFollowing,
}: IUseWhiteboardAppStateSync) => {
  const whiteboardAppState = useAppSelector(
    (state) => state.whiteboard.whiteboardAppState,
  );

  // Stable debounced handler to prevent rapid consecutive viewport updates from choking the CPU
  const debouncedSync = useMemo(
    () =>
      debounce(
        (api: ExcalidrawImperativeAPI, state: typeof whiteboardAppState) => {
          if (!state) return;

          // Receiver's current state from the API
          const receiverState = api.getAppState();
          // Sender's state
          const senderState = state;

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

          api.updateScene({ appState: appState as AppState });
        },
        VIEWPORT_SYNC_DEBOUNCE_TIMEOUT,
      ),
    [],
  );

  // for handling AppState changes
  useEffect(() => {
    if (excalidrawAPI && whiteboardAppState && isFollowing) {
      debouncedSync(excalidrawAPI, whiteboardAppState);
    }

    return () => {
      debouncedSync.cancel();
    };
  }, [excalidrawAPI, whiteboardAppState, isFollowing, debouncedSync]);
};

export default useWhiteboardAppStateSync;
