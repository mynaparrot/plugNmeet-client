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
import './style.css';
import { RootState, store, useAppDispatch, useAppSelector } from '../../store';
import { useCallbackRefState } from './helpers/hooks/useCallbackRefState';
import {
  DataMessageType,
  IDataMessage,
  WhiteboardMsg,
  WhiteboardMsgType,
} from '../../store/slices/interfaces/dataMessages';
import {
  isSocketConnected,
  sendWebsocketMessage,
} from '../../helpers/websocket';
import {
  ReconciledElements,
  reconcileElements,
} from './helpers/reconciliation';
import { participantsSelector } from '../../store/slices/participantSlice';
import { useTranslation } from 'react-i18next';
import { updateExcalidrawElements } from '../../store/slices/whiteboard';
import UploadFiles from './uploadFiles';
import { IWhiteboardFile } from '../../store/slices/interfaces/whiteboard';
import { fetchFileWithElm } from './helpers/fileReader';
import {
  broadcastSceneOnChange,
  sendRequestedForWhiteboardData,
  sendWhiteboardDataAsDonor,
} from './helpers/handleRequestedWhiteboardData';
import FooterUI from './footerUI';
import usePreviousFileId from './helpers/hooks/usePreviousFileId';

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
const whiteboardFilesSelector = createSelector(
  (state: RootState) => state.whiteboard.whiteboardFiles,
  (whiteboardFiles) => whiteboardFiles,
);
const requestedWhiteboardDataSelector = createSelector(
  (state: RootState) => state.whiteboard.requestedWhiteboardData,
  (requestedWhiteboardData) => requestedWhiteboardData,
);
const lockWhiteboardSelector = createSelector(
  (state: RootState) =>
    state.session.currenUser?.metadata?.lock_settings?.lock_whiteboard,
  (lock_whiteboard) => lock_whiteboard,
);

const currentPageSelector = createSelector(
  (state: RootState) => state.whiteboard.currentPage,
  (currentPage) => currentPage,
);
const whiteboardFileIdSelector = createSelector(
  (state: RootState) => state.whiteboard.whiteboardFileId,
  (whiteboardFileId) => whiteboardFileId,
);

const Whiteboard = ({ videoSubscribers }: IWhiteboardProps) => {
  const currentUser = store.getState().session.currenUser;
  const currentRoom = store.getState().session.currentRoom;
  const CURSOR_SYNC_TIMEOUT = 33;
  const collaborators = new Map<string, Collaborator>();

  const { i18n } = useTranslation();
  const dispatch = useAppDispatch();
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
  const whiteboardFiles = useAppSelector(whiteboardFilesSelector);
  const requestedWhiteboardData = useAppSelector(
    requestedWhiteboardDataSelector,
  );
  const lockWhiteboard = useAppSelector(lockWhiteboardSelector);
  const currentPage = useAppSelector(currentPageSelector);
  const whiteboardFileId = useAppSelector(whiteboardFileIdSelector);
  const previousFileId = usePreviousFileId(whiteboardFileId);

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

    return () => {
      if (excalidrawAPI) {
        const lastExcalidrawElements = JSON.stringify(
          excalidrawAPI.getSceneElementsIncludingDeleted(),
        );
        dispatch(updateExcalidrawElements(lastExcalidrawElements));
      }
    };
    //eslint-disable-next-line
  }, [excalidrawAPI]);

  // keep looking for request from other users & send data
  useEffect(() => {
    if (!excalidrawAPI) {
      // get initial data from other users
      // who had joined before me
      sendRequestedForWhiteboardData();
    }

    if (requestedWhiteboardData.requested && excalidrawAPI) {
      sendWhiteboardDataAsDonor(excalidrawAPI, requestedWhiteboardData.sendTo);
    }
  }, [requestedWhiteboardData, excalidrawAPI]);

  // if whiteboard file ID change this mean new office file was uploaded,
  // so we'll clean the canvas.
  useEffect(() => {
    if (excalidrawAPI && whiteboardFileId !== previousFileId) {
      setLastBroadcastOrReceivedSceneVersion(-1);
      excalidrawAPI.updateScene({
        elements: [],
      });
      excalidrawAPI.addFiles([]);
      sessionStorage.clear();
    }
    //eslint-disable-next-line
  }, [whiteboardFileId, excalidrawAPI, previousFileId]);

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

  // if page change then we'll reset version
  useEffect(() => {
    setLastBroadcastOrReceivedSceneVersion(-1);
    // for recorder & other user we'll clean from here
    if (!currentUser?.metadata?.is_admin || currentUser?.isRecorder) {
      excalidrawAPI?.updateScene({
        elements: [],
      });
      excalidrawAPI?.addFiles([]);
    }
    //eslint-disable-next-line
  }, [currentPage, excalidrawAPI]);

  // for handling draw elements
  useEffect(() => {
    if (excalidrawElements && excalidrawAPI) {
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
  }, [excalidrawElements, excalidrawAPI]);

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
    if (whiteboardFiles && excalidrawAPI) {
      const files: Array<IWhiteboardFile> = JSON.parse(whiteboardFiles);
      if (files.length) {
        const currentPageFiles = files.filter(
          (file) => file.currenPage === currentPage,
        );
        handleExcalidrawAddFiles(excalidrawAPI, currentPageFiles);
      }
    }
    //eslint-disable-next-line
  }, [whiteboardFiles, excalidrawAPI, currentPage]);

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
      let hasFile = false;
      for (const canvasFile in canvasFiles) {
        if (canvasFiles[canvasFile].id === file.id) {
          hasFile = true;
          break;
        }
      }

      if (!hasFile) {
        const appStat = excalidrawAPI.getAppState();
        const result = await fetchFileWithElm(
          url,
          file.id,
          lastBroadcastOrReceivedSceneVersion,
          appStat.height,
          appStat.width,
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
    if (
      excalidrawAPI &&
      currentUser &&
      elements.length &&
      isSocketConnected()
    ) {
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
      if (payload.pointersMap.size < 2 && currentUser && isSocketConnected()) {
        const msg = {
          pointer: payload.pointer,
          button: payload.button || 'up',
          selectedElementIds: excalidrawAPI?.getAppState().selectedElementIds,
          userId: currentUser.userId,
          name: currentUser.name,
        };

        const info: WhiteboardMsg = {
          type: WhiteboardMsgType.POINTER_UPDATE,
          from: {
            sid: currentUser.sid,
            userId: currentUser.userId,
          },
          msg: JSON.stringify(msg),
        };

        const data: IDataMessage = {
          type: DataMessageType.WHITEBOARD,
          room_id: currentRoom.room_id,
          room_sid: currentRoom.sid,
          message_id: '',
          body: info,
        };

        sendWebsocketMessage(JSON.stringify(data));
      }
    },
    CURSOR_SYNC_TIMEOUT,
  );

  const renderTopRightUI = () => {
    return (
      <>
        {currentUser?.metadata?.is_admin ? (
          <UploadFiles currenPage={currentPage} />
        ) : null}
      </>
    );
  };

  const renderFooter = () => {
    return <FooterUI excalidrawAPI={excalidrawAPI} />;
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
        UIOptions={{ canvasActions: { loadScene: false, export: false } }}
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
