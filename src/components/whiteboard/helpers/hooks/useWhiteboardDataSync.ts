import { useCallback, useEffect, useState } from 'react';
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
}

const useWhiteboardDataSync = ({
  excalidrawAPI,
  fetchedData,
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
    if (excalidrawAPI && whiteboard.whiteboardAppState) {
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

      // if width isn't same then we will avoid changes
      // otherwise in small devices it will be problem.
      if (receiverState.width >= senderState.width) {
        appState.scrollX = senderState.scrollX;
        appState.scrollY = senderState.scrollY;
        appState.zoom = {
          value: senderState.zoomValue,
        };
      }

      excalidrawAPI.updateScene({ appState: appState as AppState });
    }
  }, [excalidrawAPI, whiteboard.whiteboardAppState]);

  return {
    lastBroadcastOrReceivedSceneVersion,
    setLastBroadcastOrReceivedSceneVersion,
  };
};

export default useWhiteboardDataSync;
