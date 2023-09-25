import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch } from '../../store';
import { ISession } from '../../store/slices/interfaces/session';
import { IWhiteboardFile } from '../../store/slices/interfaces/whiteboard';
import { addWhiteboardOtherImageFile } from '../../store/slices/whiteboard';
import {
  sendAnalyticsByWebsocket,
  sendWebsocketMessage,
} from '../../helpers/websocket';
import { randomString, sleep } from '../../helpers/utils';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import { broadcastWhiteboardOfficeFile } from './helpers/handleRequestedWhiteboardData';
import useResumableFilesUpload from '../../helpers/hooks/useResumableFilesUpload';
// eslint-disable-next-line import/no-unresolved
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import useStorePreviousInt from '../../helpers/hooks/useStorePreviousInt';
import {
  DataMessage,
  DataMsgBodyType,
  DataMsgType,
} from '../../helpers/proto/plugnmeet_datamessage_pb';
import {
  formatStorageKey,
  handleToAddWhiteboardUploadedOfficeNewFile,
} from './helpers/utils';
import {
  AnalyticsEvents,
  AnalyticsEventType,
} from '../../helpers/proto/plugnmeet_analytics_pb';

interface IUploadFilesProps {
  refreshFileBrowser: number;
  allowedFileTypes: Array<string>;
  currentPage: number;
  excalidrawAPI: ExcalidrawImperativeAPI;
}

const UploadFilesUI = ({
  refreshFileBrowser,
  allowedFileTypes,
  currentPage,
  excalidrawAPI,
}: IUploadFilesProps) => {
  const inputFile = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<Array<File>>();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const session = store.getState().session;
  const preRefreshFileBrowser = useStorePreviousInt(refreshFileBrowser);

  const { isUploading, result } = useResumableFilesUpload({
    allowedFileTypes,
    maxFileSize: '30',
    files,
  });

  useEffect(() => {
    if (result && result.filePath) {
      postUploadTask(result.filePath, result.fileName, result.fileExtension);
    }
    //eslint-disable-next-line
  }, [result]);

  useEffect(() => {
    if (
      !isUploading &&
      refreshFileBrowser > 0 &&
      preRefreshFileBrowser !== refreshFileBrowser
    ) {
      inputFile.current?.click();
    }
  }, [refreshFileBrowser, isUploading, preRefreshFileBrowser]);

  const onChange = (e) => {
    const files = e.target.files;
    if (!files.length) {
      return;
    }
    setFiles([...files]);
  };

  const postUploadTask = (filePath, fileName, fileExtension) => {
    switch (fileExtension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'svg':
        toast(t('right-panel.file-upload-success'), {
          type: toast.TYPE.SUCCESS,
        });
        broadcastFile(filePath, fileName);
        // send analytics
        sendAnalyticsByWebsocket(
          AnalyticsEvents.ANALYTICS_EVENT_USER_WHITEBOARD_FILES,
          AnalyticsEventType.USER,
          fileName,
        );
        sendAnalyticsByWebsocket(
          AnalyticsEvents.ANALYTICS_EVENT_ROOM_WHITEBOARD_FILES,
          AnalyticsEventType.ROOM,
          fileName,
        );
        break;
      default:
        convertFile(session, filePath);
        break;
    }
  };

  const convertFile = async (session: ISession, filePath: string) => {
    const id = toast.loading(t('whiteboard.converting'), {
      type: 'info',
    });
    const body: any = {
      sid: session.currentRoom.sid,
      roomId: session.currentRoom.room_id,
      userId: session.currentUser?.userId,
      file_path: filePath,
    };
    const res = await sendAPIRequest('convertWhiteboardFile', body);
    if (!res.status) {
      toast.update(id, {
        render: t(res.msg),
        type: 'error',
        isLoading: false,
        closeButton: true,
      });
      return;
    }

    // save current page state before changes
    await saveCurrentPageData();

    // is important here, otherwise file id will be invalid
    // in handleToAddWhiteboardUploadedOfficeNewFile
    res.whiteboard_file_id = res.file_id;
    const newFile = handleToAddWhiteboardUploadedOfficeNewFile(
      res,
      excalidrawAPI.getAppState().height,
      excalidrawAPI.getAppState().width,
    );

    await sleep(500);
    broadcastWhiteboardOfficeFile(newFile);

    // send analytics
    sendAnalyticsByWebsocket(
      AnalyticsEvents.ANALYTICS_EVENT_USER_WHITEBOARD_FILES,
      AnalyticsEventType.USER,
      newFile.fileName,
    );
    sendAnalyticsByWebsocket(
      AnalyticsEvents.ANALYTICS_EVENT_ROOM_WHITEBOARD_FILES,
      AnalyticsEventType.ROOM,
      newFile.fileName,
    );

    toast.update(id, {
      render: t('whiteboard.file-ready'),
      type: 'success',
      isLoading: false,
      autoClose: 1000,
    });
  };

  const broadcastFile = (filePath, fileName) => {
    const file: IWhiteboardFile = {
      id: randomString(),
      currentPage,
      filePath,
      fileName,
      uploaderWhiteboardHeight: excalidrawAPI.getAppState().height,
      uploaderWhiteboardWidth: excalidrawAPI.getAppState().width,
      isOfficeFile: false,
    };
    dispatch(addWhiteboardOtherImageFile(file));

    const files =
      store.getState().whiteboard.whiteboardOfficeFilePagesAndOtherImages;
    const session = store.getState().session;
    const dataMsg = new DataMessage({
      type: DataMsgType.WHITEBOARD,
      roomSid: session.currentRoom.sid,
      roomId: session.currentRoom.room_id,
      body: {
        type: DataMsgBodyType.ADD_WHITEBOARD_FILE,
        from: {
          sid: session.currentUser?.sid ?? '',
          userId: session.currentUser?.userId ?? '',
        },
        msg: files,
      },
    });

    sendWebsocketMessage(dataMsg.toBinary());
  };

  const saveCurrentPageData = async () => {
    if (!excalidrawAPI) {
      return;
    }
    const elms = excalidrawAPI.getSceneElementsIncludingDeleted();
    if (elms.length) {
      const currentPageNumber = store.getState().whiteboard.currentPage;
      sessionStorage.setItem(
        formatStorageKey(currentPageNumber),
        JSON.stringify(elms),
      );
    }
  };

  const render = () => {
    return (
      <>
        <input
          type="file"
          id="chat-file"
          ref={inputFile}
          style={{ display: 'none' }}
          onChange={(e) => onChange(e)}
          accept={allowedFileTypes.map((file) => '.' + file).join(',')}
        />
      </>
    );
  };

  return render();
};

export default UploadFilesUI;
