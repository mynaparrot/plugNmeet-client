import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { throttle } from 'es-toolkit';
import { useTranslation } from 'react-i18next';
import {
  CaptureUpdateAction,
  Excalidraw,
  Footer,
  getSceneVersion,
  MainMenu,
  reconcileElements,
} from '@excalidraw/excalidraw';
import {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawProps,
  Gesture,
} from '@excalidraw/excalidraw/types';
import { toast } from 'react-toastify';
import { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { RemoteExcalidrawElement } from '@excalidraw/excalidraw/data/reconcile';

import '@excalidraw/excalidraw/index.css';
import './style.css';

import ManageOfficeFilesModal from './manage-office-files';
import FooterUI from './footerUI';

import { store, useAppDispatch, useAppSelector } from '../../store';
import {
  broadcastAppStateChanges,
  broadcastMousePointerUpdate,
  broadcastSceneOnChange,
} from './helpers/handleRequestedWhiteboardData';
import usePrevious from './helpers/hooks/usePrevious';
import useWhiteboardSetup from './helpers/hooks/useWhiteboardSetup';
import useWhiteboardDataSharer from './helpers/hooks/useWhiteboardDataSharer';
import useWhiteboardAppStateSync from './helpers/hooks/useWhiteboardAppStateSync';
import useOfficePageSyncer from './helpers/hooks/useOfficePageSyncer';
import {
  addAllExcalidrawElements,
  updateExcalidrawElements,
  updateMousePointerLocation,
} from '../../store/slices/whiteboard';
import {
  displaySavedPageData,
  ensureAllImagesDataIsLoaded,
} from './helpers/utils';
import { sleep } from '../../helpers/utils';
import { cleanProcessedImageElementsMap } from './helpers/handleFiles';

interface WhiteboardProps {
  onReadyExcalidrawAPI: (excalidrawAPI: ExcalidrawImperativeAPI) => void;
}

const CURSOR_SYNC_TIMEOUT = 33;

const Whiteboard = ({ onReadyExcalidrawAPI }: WhiteboardProps) => {
  const dispatch = useAppDispatch();
  const { i18n, t } = useTranslation();
  const { currentUser, isRecorder, roomId } = useMemo(() => {
    const session = store.getState().session;
    const currentUser = session.currentUser;
    return {
      currentUser,
      isRecorder: !!currentUser?.isRecorder,
      roomId: session.currentRoom.roomId,
    };
  }, []);

  // Selectors
  const isPresenter = useAppSelector(
    (state) => state.session.currentUser?.metadata?.isPresenter,
  );
  const lockWhiteboard = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockWhiteboard,
  );

  const theme = useAppSelector((state) => state.roomSettings.theme);
  const screenWidth = useAppSelector(
    (state) => state.bottomIconsActivity.screenWidth,
  );
  const currentPage = useAppSelector((state) => state.whiteboard.currentPage);
  const currentWhiteboardOfficeFileId = useAppSelector(
    (state) => state.whiteboard.currentWhiteboardOfficeFileId,
  );
  const allExcalidrawElements = useAppSelector(
    (state) => state.whiteboard.allExcalidrawElements,
  );
  const excalidrawElements = useAppSelector(
    (state) => state.whiteboard.excalidrawElements,
  );

  // State and Refs
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [isOpenManageFilesUI, setIsOpenManageFilesUI] =
    useState<boolean>(false);

  const previousFileId = usePrevious(currentWhiteboardOfficeFileId);
  const previousPage = usePrevious(currentPage);

  const isProgrammaticScroll = useRef(false);
  const isSwitching = useRef(false);
  const lastBroadcastOrReceivedSceneVersion = useRef<number>(-1);

  // Custom Hooks for modularity
  const { viewModeEnabled } = useWhiteboardSetup({
    excalidrawAPI,
    isPresenter,
    lockWhiteboard,
    isRecorder,
  });
  const { fetchedData, setFetchedData, fetchDataFromDonner } =
    useWhiteboardDataSharer({
      excalidrawAPI,
    });
  useWhiteboardAppStateSync({
    excalidrawAPI,
    isFollowing,
    isProgrammaticScroll,
  });
  const { syncOfficeFilePage } = useOfficePageSyncer({
    excalidrawAPI,
    isPresenter,
    currentPage,
  });

  /**
   * Reconciles remote scene elements with local ones and updates the canvas.
   * @param remoteElements The JSON string of the remote Excalidraw elements.
   * @param init A flag to indicate if this is the initial scene load.
   */
  const reconcileAndUpdateScene = useCallback(
    (remoteElements: string, { init = false }: { init?: boolean } = {}) => {
      // 1. Do nothing if Excalidraw API is not ready.
      if (!excalidrawAPI) {
        return;
      }
      try {
        // 2. Parse the incoming elements from the remote source.
        const parsedElements: RemoteExcalidrawElement[] =
          JSON.parse(remoteElements);
        // 3. Exit if there are no elements to process.
        if (!parsedElements || !parsedElements.length) {
          return;
        }

        // 4. Get the current local elements and app state from the canvas.
        const localElements = excalidrawAPI.getSceneElementsIncludingDeleted();
        const appState = excalidrawAPI.getAppState();

        // 5. Reconcile local elements with remote elements to prevent conflicts
        // and merge changes smoothly.
        const reconciledElements = reconcileElements(
          localElements,
          parsedElements,
          appState,
        );

        // 6. Ensure that any image elements have their binary data loaded.
        // This is crucial when receiving scenes from remote peers.
        ensureAllImagesDataIsLoaded(excalidrawAPI, reconciledElements);

        // 7. Update the Excalidraw scene with the reconciled elements.
        // `captureUpdate: NEVER` prevents this update from being added to the undo/redo history,
        // as it's a sync operation, not a user action.
        excalidrawAPI.updateScene({
          elements: reconciledElements,
          captureUpdate: init
            ? CaptureUpdateAction.IMMEDIATELY
            : CaptureUpdateAction.NEVER,
        });
        // 8. Update the scene version to the latest received version.
        // This prevents re-broadcasting of the same data.
        lastBroadcastOrReceivedSceneVersion.current =
          getSceneVersion(reconciledElements);
        // 9. Clear the history to ensure a clean state after the remote update.
        excalidrawAPI.history.clear();
      } catch (e) {
        console.error(e);
      }
    },
    [excalidrawAPI],
  );

  /**
   * Handles the logic for switching between whiteboard pages or office documents.
   * It cleans the canvas and prepares it for new data.
   */
  const handleSwitchPageOrDocument = useCallback(async () => {
    // 1. Do nothing if Excalidraw API is not ready.
    if (!excalidrawAPI) return;

    // 2. Set a flag to prevent other actions during the transition.
    isSwitching.current = true;

    // 3. Clean up the whiteboard canvas for all users.
    excalidrawAPI.updateScene({ elements: [] });
    excalidrawAPI.addFiles([]);
    excalidrawAPI.history.clear();

    // 4. Reset the internal state for a clean slate.
    lastBroadcastOrReceivedSceneVersion.current = -1;
    cleanProcessedImageElementsMap();
    setIsFollowing(true);

    // 5. Handle data loading based on user role.
    // If the user is the presenter, load the switched page/document data if previously saved.
    if (isPresenter) {
      const loadedFromStorage = await displaySavedPageData(
        excalidrawAPI,
        isPresenter,
        currentPage,
      );
      if (loadedFromStorage) {
        isSwitching.current = false;
      } else {
        // This mean new file so sync the office file page.
        // We get the data first, then unlock, then update the scene.
        // This allows the broadcast to happen immediately via onChange.
        const elements = await syncOfficeFilePage(currentPage);
        isSwitching.current = false;
        if (elements) {
          excalidrawAPI.updateScene({ elements });
        }
      }
    } else {
      // 6. If not the presenter, simply end the switching state.
      // They will receive the new data from the presenter.
      isSwitching.current = false; // No data to load, so we can stop switching.
    }
  }, [excalidrawAPI, isPresenter, currentPage, syncOfficeFilePage]);

  // clean up store during exit
  useEffect(() => {
    return () => {
      dispatch(updateExcalidrawElements(''));
      dispatch(updateMousePointerLocation(''));
      dispatch(addAllExcalidrawElements(''));
      cleanProcessedImageElementsMap();
    };
  }, [dispatch]);

  // on mount: if presenter, display saved data
  useEffect(() => {
    if (!excalidrawAPI) {
      return;
    }

    const initialize = async () => {
      const isPresenter =
        store.getState().session.currentUser?.metadata?.isPresenter;
      if (isPresenter) {
        // if presenter then we'll fetch storage to display after initialize excalidraw
        isSwitching.current = true;
        const { currentWhiteboardOfficeFileId, currentPage } =
          store.getState().whiteboard;
        const hasData = await displaySavedPageData(
          excalidrawAPI,
          true,
          currentPage,
          currentWhiteboardOfficeFileId,
          isSwitching,
        );
        if (!hasData) {
          fetchDataFromDonner();
        } else {
          setFetchedData(true);
        }
      } else {
        fetchDataFromDonner();
      }
    };

    setTimeout(() => initialize().then(), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excalidrawAPI]);

  // when receive full whiteboard data
  useEffect(() => {
    if (excalidrawAPI && allExcalidrawElements) {
      sleep(300).then(() => reconcileAndUpdateScene(allExcalidrawElements));
    }
  }, [excalidrawAPI, allExcalidrawElements, reconcileAndUpdateScene]);

  // for handling draw elements
  useEffect(() => {
    if (
      !isSwitching.current &&
      excalidrawAPI &&
      excalidrawElements &&
      fetchedData
    ) {
      reconcileAndUpdateScene(excalidrawElements);
    }
  }, [excalidrawAPI, excalidrawElements, reconcileAndUpdateScene, fetchedData]);

  // Effect for page or file changes
  useEffect(() => {
    const hasFileChanged =
      previousFileId && currentWhiteboardOfficeFileId !== previousFileId;
    const hasPageChanged = previousPage && currentPage !== previousPage;

    if (!isSwitching.current && (hasFileChanged || hasPageChanged)) {
      handleSwitchPageOrDocument().then();
    }
  }, [
    currentWhiteboardOfficeFileId,
    previousFileId,
    currentPage,
    previousPage,
    handleSwitchPageOrDocument,
  ]);

  const handleCanvasChange = (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    if (
      !excalidrawAPI || // API not ready
      !currentUser || // User not available
      !elements.length || // No elements to sync
      isSwitching.current // A page/file switch is in progress
    ) {
      return;
    }

    // Presenters or unlocked users can broadcast scene changes.
    if (
      (isPresenter || lockWhiteboard === false) &&
      getSceneVersion(elements) > lastBroadcastOrReceivedSceneVersion.current
    ) {
      lastBroadcastOrReceivedSceneVersion.current = getSceneVersion(elements);
      broadcastSceneOnChange(
        elements,
        false,
        undefined,
        excalidrawAPI,
        files,
      ).then();
    }

    // Only the presenter can broadcast app state changes (zoom, scroll, etc.).
    if (isPresenter) {
      broadcastAppStateChanges(
        appState.height,
        appState.width,
        appState.scrollX,
        appState.scrollY,
        appState.zoom.value,
        appState.theme,
        appState.viewBackgroundColor,
        appState.zenModeEnabled,
        appState.gridSize,
      ).then();
    }
  };

  const onPointerUpdate = throttle(
    (payload: { pointer; button; pointersMap: Gesture['pointers'] }) => {
      // Only broadcast pointer if user is presenter or is unlocked, and not using multi-touch.
      if (
        (!isPresenter && lockWhiteboard !== false) ||
        !currentUser ||
        payload.pointersMap.size >= 2
      ) {
        return;
      }
      const msg = {
        pointer: payload.pointer,
        button: payload.button || 'up',
        selectedElementIds: excalidrawAPI?.getAppState().selectedElementIds,
        userId: currentUser.userId,
        name: currentUser.name,
      };
      broadcastMousePointerUpdate(msg).then();
    },
    CURSOR_SYNC_TIMEOUT,
  );

  const showSwitchingWarning = () => {
    if (isSwitching.current) {
      toast(t('notifications.whiteboard-other-task-to-finish'), {
        type: 'warning',
      });
      return true;
    }
    return false;
  };

  const onScrollChange: ExcalidrawProps['onScrollChange'] = () => {
    if (!isPresenter && !isProgrammaticScroll.current) {
      setIsFollowing(false);
    }
  };

  const renderTopRightUI = () => (
    <>
      {isPresenter && excalidrawAPI && (
        <div className="menu relative z-10">
          <button
            onClick={() => setIsOpenManageFilesUI(true)}
            className="wb-manage-upload-file ml-1"
          >
            <i className="pnm-attachment text-[13px]" />
            {t('whiteboard.manage-files')}
          </button>
        </div>
      )}
    </>
  );

  const renderFooter = () => (
    <FooterUI
      excalidrawAPI={excalidrawAPI}
      isPresenter={isPresenter ?? false}
      isFollowing={isFollowing}
      setIsFollowing={setIsFollowing}
      showSwitchingWarning={showSwitchingWarning}
    />
  );

  return (
    <div className="excalidraw-wrapper flex-1 w-full max-w-[1140px] m-auto h-[calc(100%-50px)] sm:px-5 mt-9 z-0">
      {isPresenter && excalidrawAPI && (
        <ManageOfficeFilesModal
          roomId={roomId}
          excalidrawAPI={excalidrawAPI}
          onClose={() => setIsOpenManageFilesUI(false)}
          isOpen={isOpenManageFilesUI}
          showSwitchingWarning={showSwitchingWarning}
        />
      )}
      <Excalidraw
        excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
          if (api) {
            setExcalidrawAPI(api);
            onReadyExcalidrawAPI(api);
          }
        }}
        onChange={handleCanvasChange}
        onPointerUpdate={onPointerUpdate}
        onScrollChange={onScrollChange}
        viewModeEnabled={viewModeEnabled}
        isCollaborating={true}
        theme={theme}
        name="plugNmeet whiteboard"
        UIOptions={{
          canvasActions: {
            loadScene: false,
            export: false,
            saveAsImage: !isRecorder,
          },
          tools: {
            image: true,
          },
        }}
        autoFocus={true}
        detectScroll={true}
        langCode={i18n.languages[0]}
        renderTopRightUI={renderTopRightUI}
        libraryReturnUrl=""
      >
        <MainMenu>
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Help />
          {screenWidth <= 767 && renderFooter()}
        </MainMenu>
        {screenWidth > 767 && <Footer>{renderFooter()}</Footer>}
      </Excalidraw>
    </div>
  );
};

export default Whiteboard;
