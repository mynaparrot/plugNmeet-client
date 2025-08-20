import { RefObject, useCallback, useEffect, useState } from 'react';
import {
  ExcalidrawImperativeAPI,
  AppState,
} from '@excalidraw/excalidraw/types';
import {
  CaptureUpdateAction,
  getSceneVersion,
  reconcileElements,
} from '@excalidraw/excalidraw';
import { ReconciledExcalidrawElement } from '@excalidraw/excalidraw/data/reconcile';
import { Theme } from '@excalidraw/excalidraw/element/types';

import { useAppSelector } from '../../../../store';
import { sleep } from '../../../../helpers/utils';

interface IUseWhiteboardDataSync {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  fetchedData: boolean;
  isFollowing: boolean;
  isProgrammaticScroll: RefObject<boolean>;
}

const useWhiteboardDataSync = ({
  excalidrawAPI,
  fetchedData,
  isFollowing,
  isProgrammaticScroll,
}: IUseWhiteboardDataSync) => {
  const whiteboard = useAppSelector((state) => state.whiteboard);
  const [
    lastBroadcastOrReceivedSceneVersion,
    setLastBroadcastOrReceivedSceneVersion,
  ] = useState<number>(-1);

  const handleRemoteSceneUpdate = useCallback(
    (
      elements: ReconciledExcalidrawElement[],
      { init = false }: { init?: boolean } = {},
    ) => {
      if (!excalidrawAPI || !elements.length) {
        return;
      }

      excalidrawAPI.updateScene({
        elements,
        captureUpdate: init
          ? CaptureUpdateAction.IMMEDIATELY
          : CaptureUpdateAction.NEVER,
      });
      setLastBroadcastOrReceivedSceneVersion(getSceneVersion(elements));
      excalidrawAPI.history.clear();
    },
    [excalidrawAPI],
  );

  const reconcileAndAddDataToWhiteboard = useCallback(
    (excalidrawElements: string) => {
      if (!excalidrawAPI) {
        return;
      }
      try {
        const elements = JSON.parse(excalidrawElements);
        const localElements = excalidrawAPI.getSceneElementsIncludingDeleted();
        const appState = excalidrawAPI.getAppState();

        const reconciledElements = reconcileElements(
          localElements,
          elements,
          appState,
        );

        handleRemoteSceneUpdate(reconciledElements);
      } catch (e) {
        console.error(e);
      }
    },
    [excalidrawAPI, handleRemoteSceneUpdate],
  );

  // when receive full whiteboard data
  useEffect(() => {
    if (whiteboard.allExcalidrawElements === '' || !excalidrawAPI) {
      return;
    }
    const updateWhiteboard = async (elements: any) => {
      await sleep(300);
      reconcileAndAddDataToWhiteboard(elements);
    };
    updateWhiteboard(whiteboard.allExcalidrawElements);
  }, [
    excalidrawAPI,
    whiteboard.allExcalidrawElements,
    reconcileAndAddDataToWhiteboard,
  ]);

  // for handling draw elements
  useEffect(() => {
    if (whiteboard.excalidrawElements && excalidrawAPI && fetchedData) {
      reconcileAndAddDataToWhiteboard(whiteboard.excalidrawElements);
    }
  }, [
    excalidrawAPI,
    whiteboard.excalidrawElements,
    fetchedData,
    reconcileAndAddDataToWhiteboard,
  ]);

  // for handling AppState changes
  useEffect(() => {
    if (excalidrawAPI && whiteboard.whiteboardAppState && isFollowing) {
      // Receiver's current state from the API
      const receiverState = excalidrawAPI.getAppState();
      // Sender's state from Redux
      const senderState = whiteboard.whiteboardAppState;

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
  }, [
    excalidrawAPI,
    whiteboard.whiteboardAppState,
    isFollowing,
    isProgrammaticScroll,
  ]);

  return {
    lastBroadcastOrReceivedSceneVersion,
    setLastBroadcastOrReceivedSceneVersion,
  };
};

export default useWhiteboardDataSync;
