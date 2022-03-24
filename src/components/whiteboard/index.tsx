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
} from '../../helpers/websocketConnector';
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
  sendWhiteboardData,
} from './helpers/handleRequestedWhiteboardData';

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

const Whiteboard = ({ videoSubscribers }: IWhiteboardProps) => {
  const currentUser = store.getState().session.currenUser;
  const currentRoom = store.getState().session.currentRoom;
  let lastBroadcastedOrReceivedSceneVersion = -1;
  const CURSOR_SYNC_TIMEOUT = 33;
  const collaborators = new Map<string, Collaborator>();
  let fileReadImages: Array<BinaryFileData> = [];
  let fileReadElms: Array<ExcalidrawElement> = [];

  const { i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const participants = useAppSelector(participantsSelector.selectAll);
  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();
  const [viewModeEnabled, setViewModeEnabled] = useState(true);
  const [theme, setTheme] = useState('light');
  const excalidrawElements = useAppSelector(excalidrawElementsSelector);
  const mousePointerLocation = useAppSelector(mousePointerLocationSelector);
  const whiteboardFiles = useAppSelector(whiteboardFilesSelector);
  const requestedWhiteboardData = useAppSelector(
    requestedWhiteboardDataSelector,
  );

  useEffect(() => {
    if (!excalidrawAPI) {
      if (currentUser?.metadata?.is_admin) {
        setViewModeEnabled(false);
      }
      setTheme('light');
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
      sendWhiteboardData(excalidrawAPI, requestedWhiteboardData.sendTo);
    }
  }, [requestedWhiteboardData, excalidrawAPI]);

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
      handleExcalidrawAddFiles(excalidrawAPI, files);
    }
    //eslint-disable-next-line
  }, [whiteboardFiles, excalidrawAPI]);

  const handleExcalidrawAddFiles = async (
    excalidrawAPI: ExcalidrawImperativeAPI,
    files: Array<IWhiteboardFile>,
  ) => {
    for (const file of files) {
      const url =
        (window as any).PLUG_N_MEET_SERVER_URL +
        '/download/chat/' +
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
        const result = await fetchFileWithElm(
          url,
          file.id,
          lastBroadcastedOrReceivedSceneVersion,
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

    // memory cleanup
    fileReadImages = [];
    fileReadElms = [];
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
    lastBroadcastedOrReceivedSceneVersion = getSceneVersion(elements);

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
      if (getSceneVersion(elements) > lastBroadcastedOrReceivedSceneVersion) {
        lastBroadcastedOrReceivedSceneVersion = getSceneVersion(elements);
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
    return <>{currentUser?.metadata?.is_admin ? <UploadFiles /> : null}</>;
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
      />
    );
  };

  return (
    <div className="middle-fullscreen-wrapper h-full flex">
      {/*{if videoSubscribers has webcams}*/}
      <VerticalWebcams videoSubscribers={videoSubscribers} />

      <div className="excalidraw-wrapper flex-1 w-full max-w-[900px] m-auto h-[calc(100%-50px)] sm:px-5 mt-9">
        {render()}
      </div>
    </div>
  );
};

export default React.memo(Whiteboard);
