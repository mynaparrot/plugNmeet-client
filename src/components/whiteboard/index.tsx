import React, { useCallback, useEffect, useState } from 'react';
import throttle from 'lodash/throttle';
import { createSelector } from '@reduxjs/toolkit';
import {
  Excalidraw,
  Footer,
  MainMenu,
  getSceneVersion,
} from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import type {
  ExcalidrawImperativeAPI,
  Gesture,
  Collaborator,
  BinaryFileData,
  AppState,
} from '@excalidraw/excalidraw/types/types';

import { RootState, store, useAppSelector } from '../../store';
import { useCallbackRefState } from './helpers/hooks/useCallbackRefState';
import {
  ReconciledElements,
  reconcileElements,
} from './helpers/reconciliation';
import { participantsSelector } from '../../store/slices/participantSlice';
import { useTranslation } from 'react-i18next';
import { IWhiteboardFile } from '../../store/slices/interfaces/whiteboard';
import { fetchFileWithElm } from './helpers/fileReader';
import {
  broadcastAppStateChanges,
  broadcastMousePointerUpdate,
  broadcastSceneOnChange,
  sendRequestedForWhiteboardData,
  sendWhiteboardDataAsDonor,
} from './helpers/handleRequestedWhiteboardData';
import FooterUI from './footerUI';
import usePreviousFileId from './helpers/hooks/usePreviousFileId';
import usePreviousPage from './helpers/hooks/usePreviousPage';
import ManageFiles from './manageFiles';
import {
  addPreloadedLibraryItems,
  displaySavedPageData,
} from './helpers/utils';

import './style.scss';

interface WhiteboardProps {
  onReadyExcalidrawAPI: (excalidrawAPI: ExcalidrawImperativeAPI) => void;
}

const whiteboardSelector = (state: RootState) => state.whiteboard;
const lockWhiteboardSelector = createSelector(
  (state: RootState) => state.session.currentUser?.metadata?.lock_settings,
  (lock_settings) => lock_settings?.lock_whiteboard,
);
const isPresenterSelector = createSelector(
  (state: RootState) => state.session.currentUser?.metadata,
  (metadata) => metadata?.is_presenter,
);
const themeSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.theme,
);
const screenWidthSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity,
  (bottomIconsActivity) => bottomIconsActivity.screenWidth,
);

const Whiteboard = ({ onReadyExcalidrawAPI }: WhiteboardProps) => {
  const currentUser = store.getState().session.currentUser;
  const currentRoom = store.getState().session.currentRoom;
  const CURSOR_SYNC_TIMEOUT = 33;
  const collaborators = new Map<string, Collaborator>();

  const { i18n } = useTranslation();
  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();
  const [viewModeEnabled, setViewModeEnabled] = useState(true);
  const theme = useAppSelector(themeSelector);
  const [
    lastBroadcastOrReceivedSceneVersion,
    setLastBroadcastOrReceivedSceneVersion,
  ] = useState<number>(-1);

  const whiteboard = useAppSelector(whiteboardSelector);
  const previousFileId = usePreviousFileId(
    whiteboard.currentWhiteboardOfficeFileId,
  );
  const previousPage = usePreviousPage(whiteboard.currentPage);

  const participants = useAppSelector(participantsSelector.selectAll);
  const lockWhiteboard = useAppSelector(lockWhiteboardSelector);
  const isPresenter = useAppSelector(isPresenterSelector);

  const [fetchedData, setFetchedData] = useState<boolean>(false);
  const [currentWhiteboardWidth, setCurrentWhiteboardWidth] =
    useState<number>(0);
  const screenWidth = useAppSelector(screenWidthSelector);

  useEffect(() => {
    const s = store.getState();
    const isPresenter = s.session.currentUser?.metadata?.is_presenter;

    if (excalidrawAPI) {
      if (isPresenter) {
        // if presenter then we'll fetch storage to display after initialize excalidraw
        setTimeout(() => {
          const currentPage = s.whiteboard.currentPage;
          displaySavedPageData(excalidrawAPI, isPresenter, currentPage);
        }, 100);
      }
    } else if (
      !currentUser?.isRecorder &&
      !currentRoom.metadata?.default_lock_settings?.lock_whiteboard
    ) {
      setViewModeEnabled(false);
    }
    //eslint-disable-next-line
  }, [excalidrawAPI]);

  // keep looking for request from other users & send data
  useEffect(() => {
    if (!fetchedData && excalidrawAPI) {
      // get initial data from other users
      // who had joined before me
      sendRequestedForWhiteboardData();
      setFetchedData(true);
    }

    if (whiteboard.requestedWhiteboardData.requested && excalidrawAPI) {
      sendWhiteboardDataAsDonor(
        excalidrawAPI,
        whiteboard.requestedWhiteboardData.sendTo,
      );
    }
  }, [excalidrawAPI, whiteboard.requestedWhiteboardData, fetchedData]);

  // if whiteboard file ID change this mean new office file was uploaded,
  // so we'll clean the canvas.
  useEffect(() => {
    if (
      excalidrawAPI &&
      whiteboard.currentWhiteboardOfficeFileId !== previousFileId
    ) {
      setLastBroadcastOrReceivedSceneVersion(-1);
      excalidrawAPI.updateScene({
        elements: [],
      });
      excalidrawAPI.addFiles([]);
      excalidrawAPI.history.clear();
    }
    //eslint-disable-next-line
  }, [excalidrawAPI, whiteboard.currentWhiteboardOfficeFileId, previousFileId]);

  // for adding users to canvas as collaborators
  useEffect(() => {
    if (!excalidrawAPI) {
      return;
    }
    participants.forEach((participant) => {
      if (participant.metadata.is_admin) {
        if (!collaborators.has(participant.userId)) {
          collaborators.set(participant.userId, {});
        }
      }
    });

    // now check if any user still exist after disconnected
    collaborators.forEach((_, i) => {
      const found = participants.find((p) => p.userId === i);
      if (!found) {
        collaborators.delete(i);
      }
    });
    excalidrawAPI.updateScene({ collaborators });
    //eslint-disable-next-line
  }, [excalidrawAPI, participants]);

  // looking lock settings
  useEffect(() => {
    if (typeof lockWhiteboard === 'undefined') {
      return;
    }
    if (!currentUser?.isRecorder) {
      setViewModeEnabled(lockWhiteboard);
    }
    //eslint-disable-next-line
  }, [lockWhiteboard]);

  // watch presenter changes
  useEffect(() => {
    if (!excalidrawAPI) {
      return;
    }

    if (isPresenter) {
      setViewModeEnabled(false);
      addPreloadedLibraryItems(excalidrawAPI);
    } else if (!currentUser?.isRecorder) {
      setViewModeEnabled(
        currentUser?.metadata?.lock_settings.lock_whiteboard ?? true,
      );
    }
    //eslint-disable-next-line
  }, [excalidrawAPI, isPresenter]);

  // if page change then we'll reset version
  useEffect(() => {
    if (previousPage && whiteboard.currentPage !== previousPage) {
      setLastBroadcastOrReceivedSceneVersion(-1);
    }
    // for recorder & other user we'll clean from here
    if (
      !isPresenter &&
      previousPage &&
      whiteboard.currentPage !== previousPage
    ) {
      excalidrawAPI?.updateScene({
        elements: [],
      });
      excalidrawAPI?.addFiles([]);
    }
  }, [excalidrawAPI, whiteboard.currentPage, previousPage, isPresenter]);

  const handleRemoteSceneUpdate = (
    elements: ReconciledElements,
    { init = false }: { init?: boolean } = {},
  ) => {
    if (!elements.length) {
      return;
    }

    excalidrawAPI?.updateScene({
      elements,
      commitToHistory: init,
    });
    setLastBroadcastOrReceivedSceneVersion(getSceneVersion(elements));

    // We haven't yet implemented multiplayer undo functionality, so we clear the undo stack
    // when we receive any messages from another peer. This UX can be pretty rough -- if you
    // undo, a user makes a change, and then try to redo, your element(s) will be lost. However,
    // right now we think this is the right tradeoff.
    excalidrawAPI?.history.clear();
  };

  // for handling draw elements
  useEffect(() => {
    // let's wait until fetchedData value change
    // otherwise data won't show correctly.
    if (whiteboard.excalidrawElements && excalidrawAPI && fetchedData) {
      const elements = JSON.parse(whiteboard.excalidrawElements);
      const localElements = excalidrawAPI.getSceneElementsIncludingDeleted();
      const appState = excalidrawAPI.getAppState();

      const reconciledElements = reconcileElements(
        localElements,
        elements,
        appState,
      );

      handleRemoteSceneUpdate(reconciledElements);
    }
    //eslint-disable-next-line
  }, [excalidrawAPI, whiteboard.excalidrawElements, fetchedData]);

  // for handling mouse pointer location
  useEffect(() => {
    if (whiteboard.mousePointerLocation) {
      const { pointer, button, name, userId, selectedElementIds } = JSON.parse(
        whiteboard.mousePointerLocation,
      );

      const tmp: any = new Map(collaborators);
      const user = tmp.get(userId) ?? {};
      user.pointer = pointer;
      user.button = button;
      user.selectedElementIds = selectedElementIds;
      user.username = name;
      user.id = userId;
      tmp.set(userId, user);

      excalidrawAPI?.updateScene({ collaborators: tmp });
    }
    //eslint-disable-next-line
  }, [whiteboard.mousePointerLocation]);

  // for handling AppState changes
  // websocket will update changes only if current user isn't presenter
  useEffect(() => {
    if (excalidrawAPI && whiteboard.whiteboardAppState) {
      const appState: any = {
        theme: whiteboard.whiteboardAppState.theme,
        viewBackgroundColor: whiteboard.whiteboardAppState.viewBackgroundColor,
        zenModeEnabled: whiteboard.whiteboardAppState.zenModeEnabled,
        gridSize: whiteboard.whiteboardAppState.gridSize,
      };

      // if width isn't same then we will avoid changes
      // otherwise in small devices it will be problem.
      if (currentWhiteboardWidth >= whiteboard.whiteboardAppState.width) {
        appState.scrollX = whiteboard.whiteboardAppState.scrollX;
        appState.scrollY = whiteboard.whiteboardAppState.scrollY;
        appState.zoom = {
          value: whiteboard.whiteboardAppState.zoomValue,
        };
      }
      excalidrawAPI.updateScene({
        appState,
      });
    }
    // eslint-disable-next-line
  }, [excalidrawAPI, whiteboard.whiteboardAppState]);

  const handleExcalidrawAddFiles = useCallback(
    async (files: Array<IWhiteboardFile>) => {
      if (!excalidrawAPI) {
        return;
      }
      const fileReadImages: Array<BinaryFileData> = [];
      const fileReadElms: Array<ExcalidrawElement> = [];

      for (const file of files) {
        const url =
          (window as any).PLUG_N_MEET_SERVER_URL +
          '/download/uploadedFile/' +
          file.filePath;

        const canvasFiles = excalidrawAPI.getFiles();
        const elms = excalidrawAPI.getSceneElementsIncludingDeleted();
        let hasFile = false;

        for (const canvasFile in canvasFiles) {
          if (canvasFiles[canvasFile].id === file.id) {
            // further check if element exist
            const hasElm = elms.filter((el) => el.id === file.id);
            if (hasElm.length) {
              hasFile = true;
              break;
            }
          }
        }

        if (!hasFile) {
          const result = await fetchFileWithElm(
            url,
            file.id,
            lastBroadcastOrReceivedSceneVersion,
            file.isOfficeFile,
            file.uploaderWhiteboardHeight,
            file.uploaderWhiteboardWidth,
          );
          if (result && excalidrawAPI) {
            fileReadImages.push(result.image);
            fileReadElms.push(result.elm);
          }
        }
      }

      if (!fileReadImages.length) {
        return;
      }
      // need to add all the files at a same time
      // we can't add one by one otherwise file will be missing
      excalidrawAPI.addFiles(fileReadImages);

      fileReadElms.forEach((element) => {
        // it's important to add existing elements too
        // otherwise element will be missing
        const elements = excalidrawAPI
          .getSceneElementsIncludingDeleted()
          .slice(0);
        const hasElm = elements.filter((elm) => elm.id === element.id);

        if (!hasElm.length) {
          // we shouldn't push if element already there.
          // otherwise, it will override if element's position was changed
          elements.push(element);
        }

        excalidrawAPI.updateScene({
          elements,
        });
      });
    },
    [excalidrawAPI, lastBroadcastOrReceivedSceneVersion],
  );
  // for handling files
  useEffect(() => {
    if (whiteboard.whiteboardOfficeFilePagesAndOtherImages && excalidrawAPI) {
      const files: Array<IWhiteboardFile> = JSON.parse(
        whiteboard.whiteboardOfficeFilePagesAndOtherImages,
      );
      if (files.length) {
        const currentPageFiles = files.filter(
          (file) => file.currentPage === whiteboard.currentPage,
        );
        handleExcalidrawAddFiles(currentPageFiles);
      }
    }
    //eslint-disable-next-line
  }, [
    excalidrawAPI,
    whiteboard.whiteboardOfficeFilePagesAndOtherImages,
    whiteboard.currentPage,
  ]);

  // for refreshing in various reason
  useEffect(() => {
    const doRefresh = throttle(
      () => {
        if (excalidrawAPI) {
          excalidrawAPI.refresh();
          setCurrentWhiteboardWidth(excalidrawAPI.getAppState().width);
        }
      },
      1000,
      { trailing: false },
    );

    if (whiteboard.refreshWhiteboard > 0) {
      if (excalidrawAPI) {
        doRefresh();
      }
    }
    //eslint-disable-next-line
  }, [whiteboard.refreshWhiteboard]);

  const onChange = (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
  ) => {
    if (excalidrawAPI && currentUser && elements.length) {
      if (viewModeEnabled) {
        return;
      }
      if (getSceneVersion(elements) > lastBroadcastOrReceivedSceneVersion) {
        setLastBroadcastOrReceivedSceneVersion(getSceneVersion(elements));
        broadcastSceneOnChange(elements, false);
      }

      // broadcast AppState Changes
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
    }
  };

  const onPointerUpdate = throttle(
    (payload: { pointer; button; pointersMap: Gesture['pointers'] }) => {
      if (viewModeEnabled) {
        return;
      }
      if (payload.pointersMap.size < 2 && currentUser) {
        const msg = {
          pointer: payload.pointer,
          button: payload.button || 'up',
          selectedElementIds: excalidrawAPI?.getAppState().selectedElementIds,
          userId: currentUser.userId,
          name: currentUser.name,
        };
        broadcastMousePointerUpdate(msg);
      }
    },
    CURSOR_SYNC_TIMEOUT,
  );

  const renderTopRightUI = () => {
    return (
      <>
        {isPresenter && excalidrawAPI ? (
          <ManageFiles excalidrawAPI={excalidrawAPI} />
        ) : null}
      </>
    );
  };

  const renderFooter = () => {
    return (
      <FooterUI
        excalidrawAPI={excalidrawAPI}
        isPresenter={isPresenter ?? false}
      />
    );
  };

  const handleOnReadyExcalidrawRef = (api: ExcalidrawImperativeAPI) => {
    if (api) {
      excalidrawRefCallback(api);
      onReadyExcalidrawAPI(api);
    }
  };

  return (
    <>
      <div className="excalidraw-wrapper flex-1 w-full max-w-[1200px] m-auto h-[calc(100%-50px)] sm:px-5 mt-9 z-[0]">
        <Excalidraw
          excalidrawAPI={(api: ExcalidrawImperativeAPI) =>
            handleOnReadyExcalidrawRef(api)
          }
          onChange={onChange}
          onPointerUpdate={onPointerUpdate}
          viewModeEnabled={viewModeEnabled}
          isCollaborating={true}
          theme={theme}
          name="plugNmeet whiteboard"
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: false,
              saveAsImage: !currentUser?.isRecorder,
            },
            tools: {
              image: false,
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
    </>
  );
};

export default Whiteboard;
