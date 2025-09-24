import React, { useEffect, useRef, useState } from 'react';
import { throttle } from 'es-toolkit/compat';
import {
  Excalidraw,
  Footer,
  getSceneVersion,
  MainMenu,
} from '@excalidraw/excalidraw';
import {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawProps,
  Gesture,
} from '@excalidraw/excalidraw/types';
import { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../store';
import { useCallbackRefState } from './helpers/hooks/useCallbackRefState';
import {
  broadcastAppStateChanges,
  broadcastMousePointerUpdate,
  broadcastSceneOnChange,
} from './helpers/handleRequestedWhiteboardData';
import FooterUI from './footerUI';
import usePreviousFileId from './helpers/hooks/usePreviousFileId';
import usePreviousPage from './helpers/hooks/usePreviousPage';
import ManageFiles from './manage-office-files';
import useWhiteboardPermissions from './helpers/hooks/useWhiteboardPermissions';
import useCollaborators from './helpers/hooks/useCollaborators';
import useWhiteboardLifecycle from './helpers/hooks/useWhiteboardLifecycle';
import useWhiteboardDataSync from './helpers/hooks/useWhiteboardDataSync';
import useWhiteboardFiles from './helpers/hooks/useWhiteboardFiles';
import useWhiteboardResizeHandler from './helpers/hooks/useWhiteboardResizeHandler';
import {
  addAllExcalidrawElements,
  updateExcalidrawElements,
  updateMousePointerLocation,
} from '../../store/slices/whiteboard';

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

  // Selectors
  const currentUser = useAppSelector((state) => state.session.currentUser);
  const isPresenter = useAppSelector(
    (state) => state.session.currentUser?.metadata?.isPresenter,
  );
  const lockWhiteboard = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockWhiteboard,
  );
  const isRecorder = !!currentUser?.isRecorder;

  const theme = useAppSelector((state) => state.roomSettings.theme);
  const screenWidth = useAppSelector(
    (state) => state.bottomIconsActivity.screenWidth,
  );
  const currentPage = useAppSelector((state) => state.whiteboard.currentPage);
  const currentWhiteboardOfficeFileId = useAppSelector(
    (state) => state.whiteboard.currentWhiteboardOfficeFileId,
  );

  // State and Refs
  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();
  const isProgrammaticScroll = useRef(false);
  const [isFollowing, setIsFollowing] = useState(true);
  const previousFileId = usePreviousFileId(currentWhiteboardOfficeFileId);
  const previousPage = usePreviousPage(currentPage);

  // Custom Hooks for modularity
  const { viewModeEnabled } = useWhiteboardPermissions({
    excalidrawAPI,
    isPresenter,
    lockWhiteboard,
  });
  useCollaborators({ excalidrawAPI });
  const { fetchedData } = useWhiteboardLifecycle({ excalidrawAPI });
  const {
    lastBroadcastOrReceivedSceneVersion,
    setLastBroadcastOrReceivedSceneVersion,
  } = useWhiteboardDataSync({
    excalidrawAPI,
    fetchedData,
    isFollowing,
    isProgrammaticScroll,
  });
  useWhiteboardFiles({ excalidrawAPI, lastBroadcastOrReceivedSceneVersion });
  useWhiteboardResizeHandler({ excalidrawAPI });

  // clean up store during exit
  useEffect(() => {
    return () => {
      dispatch(updateExcalidrawElements(''));
      dispatch(updateMousePointerLocation(''));
      dispatch(addAllExcalidrawElements(''));
    };
  }, [dispatch]);

  // Effect for file changes
  useEffect(() => {
    if (excalidrawAPI && currentWhiteboardOfficeFileId !== previousFileId) {
      setLastBroadcastOrReceivedSceneVersion(-1);
      excalidrawAPI.updateScene({ elements: [] });
      excalidrawAPI.addFiles([]);
      excalidrawAPI.history.clear();
    }
  }, [
    excalidrawAPI,
    currentWhiteboardOfficeFileId,
    previousFileId,
    setLastBroadcastOrReceivedSceneVersion,
  ]);

  // Effect for page changes
  useEffect(() => {
    if (previousPage && currentPage !== previousPage) {
      setLastBroadcastOrReceivedSceneVersion(-1);
      setIsFollowing(true);
    }
    // for recorder and other user we'll clean from here
    if (!isPresenter && previousPage && currentPage !== previousPage) {
      excalidrawAPI?.updateScene({ elements: [] });
      excalidrawAPI?.addFiles([]);
    }
  }, [
    excalidrawAPI,
    currentPage,
    previousPage,
    isPresenter,
    setLastBroadcastOrReceivedSceneVersion,
  ]);

  const onChange = (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    if (!excalidrawAPI || !currentUser || !elements.length || viewModeEnabled) {
      return;
    }

    if (getSceneVersion(elements) > lastBroadcastOrReceivedSceneVersion) {
      setLastBroadcastOrReceivedSceneVersion(getSceneVersion(elements));
      broadcastSceneOnChange(
        elements,
        false,
        undefined,
        excalidrawAPI,
        currentPage,
        files,
      );
    }

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
      );
    }
  };

  const onPointerUpdate = throttle(
    (payload: { pointer; button; pointersMap: Gesture['pointers'] }) => {
      if (viewModeEnabled || !currentUser || payload.pointersMap.size >= 2) {
        return;
      }
      const msg = {
        pointer: payload.pointer,
        button: payload.button || 'up',
        selectedElementIds: excalidrawAPI?.getAppState().selectedElementIds,
        userId: currentUser.userId,
        name: currentUser.name,
      };
      broadcastMousePointerUpdate(msg);
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
        <ManageFiles
          excalidrawAPI={excalidrawAPI}
          onClose={() => setIsOpenManageFilesUI(false)}
          isOpen={isOpenManageFilesUI}
        />
      )}
      <Excalidraw
        excalidrawAPI={handleOnReadyExcalidrawRef}
        onChange={onChange}
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
        //renderFooter={renderFooter}
        libraryReturnUrl=""
      >
        <MainMenu>
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Help />
          {screenWidth <= 767 ? renderFooter() : null}
        </MainMenu>
        {screenWidth > 767 ? <Footer>{renderFooter()}</Footer> : null}
      </Excalidraw>
    </div>
  );
};

export default Whiteboard;
