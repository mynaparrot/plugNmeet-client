import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch } from '../../store';
import { ISession } from '../../store/slices/interfaces/session';
import {
  IWhiteboardFile,
  IWhiteboardOfficeFile,
} from '../../store/slices/interfaces/whiteboard';
import {
  addWhiteboardOtherImageFile,
  addWhiteboardUploadedOfficeFiles,
} from '../../store/slices/whiteboard';
import { sendWebsocketMessage } from '../../helpers/websocket';
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
import { formatStorageKey } from './helpers/utils';

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
    maxFileSize: 30,
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
    const files: Array<IWhiteboardFile> = [];
    for (let i = 0; i < res.total_pages; i++) {
      const fileName = 'page_' + (i + 1) + '.png';
      const file: IWhiteboardFile = {
        id: randomString(),
        currentPage: i + 1,
        filePath: res.file_path + '/' + fileName,
        fileName,
        uploaderWhiteboardHeight: excalidrawAPI.getAppState().height,
        uploaderWhiteboardWidth: excalidrawAPI.getAppState().width,
        isOfficeFile: true,
      };
      files.push(file);
    }

    const newFile: IWhiteboardOfficeFile = {
      fileId: res.file_id,
      fileName: res.file_name,
      filePath: res.file_path,
      totalPages: res.total_pages,
      pageFiles: JSON.stringify(files),
    };
    // save current page state before changes
    await saveCurrentPageData();
    store.dispatch(addWhiteboardUploadedOfficeFiles(newFile));

    await sleep(500);
    broadcastWhiteboardOfficeFile(newFile);

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
