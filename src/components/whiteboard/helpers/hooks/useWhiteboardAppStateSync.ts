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
  const refreshWhiteboardSignal = useAppSelector(
    (state) => state.whiteboard.refreshWhiteboardSignal,
  );

  const debouncedSync = useMemo(
    () =>
      debounce(
        (api: ExcalidrawImperativeAPI, state: typeof whiteboardAppState) => {
          if (!state) return;

          const receiverState = api.getAppState();

          const senderWidth = state.width;
          const senderHeight = state.height;
          const receiverWidth = receiverState.width;
          const receiverHeight = receiverState.height;
          const senderZoom = state.zoomValue;

          if (
            !senderWidth ||
            !senderHeight ||
            !receiverWidth ||
            !receiverHeight ||
            !senderZoom
          ) {
            return;
          }

          const scaleThreshold = 0.9;
          const padding = 16;

          const rawWidthRatio = receiverWidth / senderWidth;
          const rawHeightRatio = receiverHeight / senderHeight;

          const safeReceiverWidth = Math.max(receiverWidth - padding * 2, 1);
          const safeReceiverHeight = Math.max(receiverHeight - padding * 2, 1);

          const widthScale =
            rawWidthRatio < scaleThreshold
              ? safeReceiverWidth / senderWidth
              : Math.min(1, rawWidthRatio);

          const heightScale =
            rawHeightRatio < scaleThreshold
              ? safeReceiverHeight / senderHeight
              : Math.min(1, rawHeightRatio);

          const responsiveMultiplier = Math.min(widthScale, heightScale, 1);

          const adjustedZoom = Math.max(senderZoom * responsiveMultiplier, 0.1);

          // Keep follower centered on the same scene/world point as presenter.
          const senderCenterX = -state.scrollX + senderWidth / (2 * senderZoom);
          const senderCenterY =
            -state.scrollY + senderHeight / (2 * senderZoom);

          const appState: Partial<AppState> = {
            theme: state.theme as Theme,
            viewBackgroundColor: state.viewBackgroundColor,
            zenModeEnabled: state.zenModeEnabled,
            gridSize: state.gridSize ?? undefined,
            zoom: {
              value: adjustedZoom as NormalizedZoomValue,
            },
            scrollX: -(senderCenterX - receiverWidth / (2 * adjustedZoom)),
            scrollY: -(senderCenterY - receiverHeight / (2 * adjustedZoom)),
          };

          api.updateScene({
            appState: appState as AppState,
          });
        },
        VIEWPORT_SYNC_DEBOUNCE_TIMEOUT,
      ),
    [],
  );

  // Handle incoming AppState changes from the presenter
  useEffect(() => {
    if (excalidrawAPI && whiteboardAppState && isFollowing) {
      debouncedSync(excalidrawAPI, whiteboardAppState);
    }

    return () => {
      debouncedSync.cancel();
    };
  }, [excalidrawAPI, whiteboardAppState, isFollowing, debouncedSync]);

  // Recalibrate the local viewport when the refreshWhiteboardSignal triggered
  // note: refreshWhiteboardSignal and whiteboardResetSignal are not same!
  // refreshWhiteboardSignal happen for width change, sidebar open, webcam/screen sharing on/off etc.
  useEffect(() => {
    if (
      excalidrawAPI &&
      isFollowing &&
      whiteboardAppState &&
      refreshWhiteboardSignal > 0
    ) {
      debouncedSync(excalidrawAPI, whiteboardAppState);
    }

    return () => {
      debouncedSync.cancel();
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshWhiteboardSignal]);
};

export default useWhiteboardAppStateSync;
