import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { throttle } from 'es-toolkit/compat';
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
import { ReconciledExcalidrawElement } from '@excalidraw/excalidraw/data/reconcile';
import { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../store';
import { useCallbackRefState } from './helpers/hooks/useCallbackRefState';
import {
  broadcastAppStateChanges,
  broadcastMousePointerUpdate,
  broadcastSceneOnChange,
} from './helpers/handleRequestedWhiteboardData';
import usePrevious from './helpers/hooks/usePrevious';
import useWhiteboardSetup from './helpers/hooks/useWhiteboardSetup';
import useWhiteboardDataSharer from './helpers/hooks/useWhiteboardDataSharer';
import useWhiteboardAppStateSync from './helpers/hooks/useWhiteboardAppStateSync';
import useWhiteboardFileElementsSync from './helpers/hooks/useWhiteboardFileElementsSync';
import {
  addAllExcalidrawElements,
  updateExcalidrawElements,
  updateMousePointerLocation,
} from '../../store/slices/whiteboard';
import { displaySavedPageData } from './helpers/utils';
import { sleep } from '../../helpers/utils';

import ManageOfficeFilesModal from './manage-office-files';
import FooterUI from './footerUI';

import '@excalidraw/excalidraw/index.css';
import './style.css';

interface WhiteboardProps {
  onReadyExcalidrawAPI: (excalidrawAPI: ExcalidrawImperativeAPI) => void;
}

const CURSOR_SYNC_TIMEOUT = 33;

const Whiteboard = ({ onReadyExcalidrawAPI }: WhiteboardProps) => {
  const dispatch = useAppDispatch();
  const { i18n, t } = useTranslation();
  const [isOpenManageFilesUI, setIsOpenManageFilesUI] =
    useState<boolean>(false);
  const { currentUser, isRecorder } = useMemo(() => {
    const session = store.getState().session;
    const currentUser = session.currentUser;
    return { currentUser, isRecorder: !!currentUser?.isRecorder };
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
  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();
  const [isFollowing, setIsFollowing] = useState(true);

  const previousFileId = usePrevious(currentWhiteboardOfficeFileId);
  const previousPage = usePrevious(currentPage);

  const isProgrammaticScroll = useRef(false);
  const isSwitching = useRef(false);

  // Custom Hooks for modularity
  const { viewModeEnabled } = useWhiteboardSetup({
    excalidrawAPI,
    isPresenter,
    lockWhiteboard,
    isRecorder,
  });
  const { fetchedData } = useWhiteboardDataSharer({ excalidrawAPI });
  const {
    lastBroadcastOrReceivedSceneVersion,
    setLastBroadcastOrReceivedSceneVersion,
  } = useWhiteboardAppStateSync({
    excalidrawAPI,
    isFollowing,
    isProgrammaticScroll,
  });
  useWhiteboardFileElementsSync({ excalidrawAPI });

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
    [excalidrawAPI, setLastBroadcastOrReceivedSceneVersion],
  );

  const reconcileAndAddDataToWhiteboard = useCallback(
    (remoteElements: string) => {
      if (!excalidrawAPI) {
        return;
      }
      try {
        const elements = JSON.parse(remoteElements);
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
    if (allExcalidrawElements !== '' && excalidrawAPI) {
      const updateWhiteboard = async (elements: string) => {
        await sleep(300);
        reconcileAndAddDataToWhiteboard(elements);
      };
      updateWhiteboard(allExcalidrawElements).then();
    }
  }, [excalidrawAPI, allExcalidrawElements, reconcileAndAddDataToWhiteboard]);

  // for handling draw elements
  useEffect(() => {
    if (excalidrawElements && excalidrawAPI && fetchedData) {
      reconcileAndAddDataToWhiteboard(excalidrawElements);
    }
  }, [
    excalidrawAPI,
    excalidrawElements,
    fetchedData,
    reconcileAndAddDataToWhiteboard,
  ]);

  // clean up store during exit
  useEffect(() => {
    return () => {
      dispatch(updateExcalidrawElements(''));
      dispatch(updateMousePointerLocation(''));
      dispatch(addAllExcalidrawElements(''));
    };
  }, [dispatch]);

  // on mount: if presenter, display saved data
  useEffect(() => {
    if (excalidrawAPI) {
      // if presenter then we'll fetch storage to display after initialize excalidraw
      const isPresenter =
        store.getState().session.currentUser?.metadata?.isPresenter;
      if (isPresenter) {
        isSwitching.current = true;
        const timeout = setTimeout(() => {
          displaySavedPageData(
            () => excalidrawAPI,
            true,
            store.getState().whiteboard.currentPage,
            isSwitching,
          );
        }, 100);
        return () => clearTimeout(timeout);
      }
    }
  }, [excalidrawAPI]);

  // Effect for file changes
  useEffect(() => {
    if (excalidrawAPI && currentWhiteboardOfficeFileId !== previousFileId) {
      isSwitching.current = true;
      setLastBroadcastOrReceivedSceneVersion(-1);
      excalidrawAPI.updateScene({ elements: [] });
      excalidrawAPI.addFiles([]);
      excalidrawAPI.history.clear();

      if (isPresenter) {
        displaySavedPageData(
          () => excalidrawAPI,
          isPresenter,
          currentPage,
          isSwitching,
        );
      } else {
        isSwitching.current = false;
      }
    }
  }, [
    excalidrawAPI,
    currentWhiteboardOfficeFileId,
    previousFileId,
    setLastBroadcastOrReceivedSceneVersion,
    isPresenter,
    currentPage,
  ]);

  // Effect for page changes
  useEffect(() => {
    if (previousPage && currentPage !== previousPage && excalidrawAPI) {
      isSwitching.current = true;
      setLastBroadcastOrReceivedSceneVersion(-1);
      setIsFollowing(true);

      if (isPresenter) {
        excalidrawAPI.updateScene({ elements: [] });
        displaySavedPageData(
          () => excalidrawAPI,
          isPresenter,
          currentPage,
          isSwitching,
        );
      } else {
        // for recorder and other user we'll clean from here
        excalidrawAPI.updateScene({ elements: [] });
        excalidrawAPI.addFiles([]);
        excalidrawAPI.history.clear();
        isSwitching.current = false; // No data to load, so we can stop switching.
      }
    }
  }, [
    excalidrawAPI,
    currentPage,
    previousPage,
    isPresenter,
    setLastBroadcastOrReceivedSceneVersion,
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
    if (isPresenter || lockWhiteboard === false) {
      if (getSceneVersion(elements) > lastBroadcastOrReceivedSceneVersion) {
        setLastBroadcastOrReceivedSceneVersion(getSceneVersion(elements));
        broadcastSceneOnChange(
          elements,
          false,
          undefined,
          excalidrawAPI,
          currentPage,
          files,
        ).then();
      }
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
            className="manage-icon h-[30px] lg:h-[32px] max-w text-xs px-2! rounded-lg border border-solid border-[#3d3d3d] text-[#3d3d3d] dark:text-[#b8b8b8] dark:bg-[#262627] dark:hover:bg-[#3d3d3d] hover:bg-[#3d3d3d] hover:text-[#b8b8b8] font-semibold flex items-center justify-center cursor-pointer"
          >
            <i className="pnm-attachment text-[14px] ltr:mr-1 rtl:ml-1" />
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
    />
  );

  const handleOnReadyExcalidrawRef = (api: ExcalidrawImperativeAPI) => {
    if (api) {
      excalidrawRefCallback(api);
      onReadyExcalidrawAPI(api);
    }
  };

  return (
    <div className="excalidraw-wrapper flex-1 w-full max-w-[1140px] m-auto h-[calc(100%-50px)] sm:px-5 mt-9 z-0">
      {isPresenter && excalidrawAPI && (
        <ManageOfficeFilesModal
          excalidrawAPI={excalidrawAPI}
          onClose={() => setIsOpenManageFilesUI(false)}
          isOpen={isOpenManageFilesUI}
        />
      )}
      <Excalidraw
        excalidrawAPI={handleOnReadyExcalidrawRef}
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
