import React, { useEffect, useState } from 'react';
import throttle from 'lodash/throttle';
import { LocalParticipant, RemoteParticipant } from 'livekit-client';
import { createSelector } from '@reduxjs/toolkit';
import Excalidraw, { getSceneVersion } from '@excalidraw/excalidraw';
// eslint-disable-next-line import/no-unresolved
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import {
  ExcalidrawImperativeAPI,
  Gesture,
  Collaborator,
  BinaryFileData,
  // eslint-disable-next-line import/no-unresolved
} from '@excalidraw/excalidraw/types/types';

import VerticalWebcams from '../main-area/media-elements/vertical-webcams';
import './style.scss';
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
  broadcastMousePointerUpdate,
  broadcastSceneOnChange,
  sendRequestedForWhiteboardData,
  sendWhiteboardDataAsDonor,
} from './helpers/handleRequestedWhiteboardData';
import FooterUI from './footerUI';
import usePreviousFileId from './helpers/hooks/usePreviousFileId';
import usePreviousPage from './helpers/hooks/usePreviousPage';
import ManageFiles from './manageFiles';

interface IWhiteboardProps {
  videoSubscribers?: Map<string, LocalParticipant | RemoteParticipant>;
}

const excalidrawElementsSelector = createSelector(
  (state: RootState) => state.whiteboard.excalidrawElements,
  (excalidrawElements) => excalidrawElements,
);
const mousePointerLocationSelector = createSelector(
  (state: RootState) => state.whiteboard.mousePointerLocation,
  (mousePointerLocation) => mousePointerLocation,
);
const whiteboardOfficeFilePagesAndOtherImagesSelector = createSelector(
  (state: RootState) =>
    state.whiteboard.whiteboardOfficeFilePagesAndOtherImages,
  (whiteboardOfficeFilePagesAndOtherImages) =>
    whiteboardOfficeFilePagesAndOtherImages,
);
const requestedWhiteboardDataSelector = createSelector(
  (state: RootState) => state.whiteboard.requestedWhiteboardData,
  (requestedWhiteboardData) => requestedWhiteboardData,
);
const lockWhiteboardSelector = createSelector(
  (state: RootState) =>
    state.session.currentUser?.metadata?.lock_settings?.lock_whiteboard,
  (lock_whiteboard) => lock_whiteboard,
);

const currentPageSelector = createSelector(
  (state: RootState) => state.whiteboard.currentPage,
  (currentPage) => currentPage,
);
const currentWhiteboardOfficeFileIdSelector = createSelector(
  (state: RootState) => state.whiteboard.currentWhiteboardOfficeFileId,
  (currentWhiteboardOfficeFileId) => currentWhiteboardOfficeFileId,
);
const isPresenterSelector = createSelector(
  (state: RootState) => state.session.currentUser?.metadata?.is_presenter,
  (is_presenter) => is_presenter,
);

const Whiteboard = ({ videoSubscribers }: IWhiteboardProps) => {
  const currentUser = store.getState().session.currentUser;
  const currentRoom = store.getState().session.currentRoom;
  const CURSOR_SYNC_TIMEOUT = 33;
  const collaborators = new Map<string, Collaborator>();

  const { i18n } = useTranslation();
  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();
  const [viewModeEnabled, setViewModeEnabled] = useState(true);
  const [theme, setTheme] = useState('light');
  const [
    lastBroadcastOrReceivedSceneVersion,
    setLastBroadcastOrReceivedSceneVersion,
  ] = useState<number>(-1);

  const excalidrawElements = useAppSelector(excalidrawElementsSelector);
  const mousePointerLocation = useAppSelector(mousePointerLocationSelector);
  const participants = useAppSelector(participantsSelector.selectAll);
  const whiteboardOfficeFilePagesAndOtherImages = useAppSelector(
    whiteboardOfficeFilePagesAndOtherImagesSelector,
  );
  const requestedWhiteboardData = useAppSelector(
    requestedWhiteboardDataSelector,
  );
  const lockWhiteboard = useAppSelector(lockWhiteboardSelector);
  const currentWhiteboardOfficeFileIdId = useAppSelector(
    currentWhiteboardOfficeFileIdSelector,
  );
  const previousFileId = usePreviousFileId(currentWhiteboardOfficeFileIdId);
  const isPresenter = useAppSelector(isPresenterSelector);
  const currentPage = useAppSelector(currentPageSelector);
  const previousPage = usePreviousPage(currentPage);
  const [fetchedData, setFetchedData] = useState<boolean>(false);

  useEffect(() => {
    if (!excalidrawAPI) {
      setTheme('light');
      if (
        !currentUser?.isRecorder &&
        !currentRoom.metadata?.default_lock_settings?.lock_whiteboard
      ) {
        setViewModeEnabled(false);
      }
    }
    //eslint-disable-next-line
  }, [excalidrawAPI]);

  // keep looking for request from other users & send data
  useEffect(() => {
    if (!fetchedData) {
      // get initial data from other users
      // who had joined before me
      sendRequestedForWhiteboardData();
      setFetchedData(true);
    }

    if (requestedWhiteboardData.requested && excalidrawAPI) {
      sendWhiteboardDataAsDonor(excalidrawAPI, requestedWhiteboardData.sendTo);
    }
  }, [requestedWhiteboardData, excalidrawAPI, fetchedData]);

  // if whiteboard file ID change this mean new office file was uploaded,
  // so we'll clean the canvas.
  useEffect(() => {
    if (excalidrawAPI && currentWhiteboardOfficeFileIdId !== previousFileId) {
      setLastBroadcastOrReceivedSceneVersion(-1);
      excalidrawAPI.updateScene({
        elements: [],
      });
      excalidrawAPI.addFiles([]);
      sessionStorage.clear();
    }
    //eslint-disable-next-line
  }, [currentWhiteboardOfficeFileIdId, excalidrawAPI, previousFileId]);

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

    excalidrawAPI.updateScene({ collaborators });
    //eslint-disable-next-line
  }, [participants, excalidrawAPI]);

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
    if (isPresenter) {
      setViewModeEnabled(false);
    } else if (!currentUser?.isRecorder) {
      setViewModeEnabled(
        currentUser?.metadata?.lock_settings.lock_whiteboard ?? true,
      );
    }
    //eslint-disable-next-line
  }, [isPresenter]);

  // if page change then we'll reset version
  useEffect(() => {
    if (previousPage && currentPage !== previousPage) {
      setLastBroadcastOrReceivedSceneVersion(-1);
    }
    // for recorder & other user we'll clean from here
    if (!isPresenter && previousPage && currentPage !== previousPage) {
      excalidrawAPI?.updateScene({
        elements: [],
      });
      excalidrawAPI?.addFiles([]);
    }
  }, [currentPage, previousPage, isPresenter, excalidrawAPI]);

  // for handling draw elements
  useEffect(() => {
    // let's wait until fetchedData value change
    // otherwise data won't show correctly.
    if (excalidrawElements && excalidrawAPI && fetchedData) {
      const elements = JSON.parse(excalidrawElements);
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
  }, [excalidrawElements, excalidrawAPI, fetchedData]);

  // for handling mouse pointer location
  useEffect(() => {
    if (mousePointerLocation) {
      const { pointer, button, name, userId, selectedElementIds } =
        JSON.parse(mousePointerLocation);

      const tmp: any = new Map(collaborators);
      const user = tmp.get(userId) ?? {};
      user.pointer = pointer;
      user.button = button;
      user.selectedElementIds = selectedElementIds;
      user.username = name;
      tmp.set(userId, user);

      excalidrawAPI?.updateScene({ collaborators: tmp });
    }
    //eslint-disable-next-line
  }, [mousePointerLocation]);

  // for handling files
  useEffect(() => {
    if (whiteboardOfficeFilePagesAndOtherImages && excalidrawAPI) {
      const files: Array<IWhiteboardFile> = JSON.parse(
        whiteboardOfficeFilePagesAndOtherImages,
      );
      if (files.length) {
        const currentPageFiles = files.filter(
          (file) => file.currentPage === currentPage,
        );
        handleExcalidrawAddFiles(excalidrawAPI, currentPageFiles);
      }
    }
    //eslint-disable-next-line
  }, [whiteboardOfficeFilePagesAndOtherImages, excalidrawAPI, currentPage]);

  const handleExcalidrawAddFiles = async (
    excalidrawAPI: ExcalidrawImperativeAPI,
    files: Array<IWhiteboardFile>,
  ) => {
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
  };

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

  const onChange = (elements: readonly ExcalidrawElement[]) => {
    if (excalidrawAPI && currentUser && elements.length) {
      if (viewModeEnabled) {
        return;
      }
      if (getSceneVersion(elements) > lastBroadcastOrReceivedSceneVersion) {
        setLastBroadcastOrReceivedSceneVersion(getSceneVersion(elements));
        broadcastSceneOnChange(elements);
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
          <ManageFiles
            excalidrawAPI={excalidrawAPI}
            currentPage={currentPage}
          />
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

  const render = () => {
    return (
      <Excalidraw
        ref={excalidrawRefCallback as any}
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
        }}
        autoFocus={true}
        detectScroll={true}
        langCode={i18n.languages[0]}
        renderTopRightUI={renderTopRightUI}
        renderFooter={renderFooter}
      />
    );
  };

  return (
    <div
      className={`middle-fullscreen-wrapper h-full flex ${
        videoSubscribers?.size ? 'verticalsWebcamsActivated' : ''
      }`}
    >
      {/*{if videoSubscribers has webcams}*/}
      <VerticalWebcams videoSubscribers={videoSubscribers} />
      <div className="excalidraw-wrapper flex-1 w-full max-w-[1200px] m-auto h-[calc(100%-50px)] sm:px-5 mt-9 z-[0]">
        {render()}
      </div>
    </div>
  );
};

export default React.memo(Whiteboard);
