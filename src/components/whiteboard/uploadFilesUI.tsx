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
  addWhiteboardFile,
  addWhiteboardOfficeFile,
} from '../../store/slices/whiteboard';
import {
  DataMessageType,
  IDataMessage,
  WhiteboardMsg,
  WhiteboardMsgType,
} from '../../store/slices/interfaces/dataMessages';
import { sendWebsocketMessage } from '../../helpers/websocket';
import { randomString, sleep } from '../../helpers/utils';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import { broadcastWhiteboardOfficeFile } from './helpers/handleRequestedWhiteboardData';
import useResumableFilesUpload from '../../helpers/hooks/useResumableFilesUpload';
// eslint-disable-next-line import/no-unresolved
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

interface IUploadFilesProps {
  currenPage: number;
  excalidrawAPI: ExcalidrawImperativeAPI;
}

const UploadFilesUI = ({ currenPage, excalidrawAPI }: IUploadFilesProps) => {
  const inputFile = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<Array<File>>();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  // prettier-ignore
  const allowedFileTypes = ['jpg', 'jpeg', 'png', 'svg', 'pdf', 'docx', 'doc', 'odt', 'txt', 'rtf', 'xml', 'xlsx', 'xls', 'ods', 'csv', 'pptx', 'ppt', 'odp', 'vsd', 'odg', 'html'];
  const session = store.getState().session;

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

  const openFileBrowser = () => {
    if (!isUploading) {
      inputFile.current?.click();
    }
  };

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
        currenPage: i + 1,
        filePath: res.file_path + '/' + fileName,
        fileName,
        uploaderWhiteboardHeight: excalidrawAPI.getAppState().height,
        uploaderWhiteboardWidth: excalidrawAPI.getAppState().width,
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

    store.dispatch(addWhiteboardOfficeFile(newFile));
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
      currenPage,
      filePath,
      fileName,
      uploaderWhiteboardHeight: excalidrawAPI.getAppState().height,
      uploaderWhiteboardWidth: excalidrawAPI.getAppState().width,
    };
    dispatch(addWhiteboardFile(file));

    const files = store.getState().whiteboard.whiteboardFiles;
    const session = store.getState().session;

    const info: WhiteboardMsg = {
      type: WhiteboardMsgType.ADD_WHITEBOARD_FILE,
      from: {
        sid: session.currentUser?.sid ?? '',
        userId: session.currentUser?.userId ?? '',
      },
      msg: files,
    };

    const data: IDataMessage = {
      type: DataMessageType.WHITEBOARD,
      room_sid: session.currentRoom.sid,
      room_id: session.currentRoom.room_id,
      message_id: '',
      body: info,
    };

    sendWebsocketMessage(JSON.stringify(data));
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
        <button
          disabled={isUploading}
          onClick={() => openFileBrowser()}
          className="w-[90px] text-xs h-7 flex items-center justify-center"
        >
          <i className="pnm-attachment primaryColor hover:secondaryColor text-[14px] opacity-50 mr-1" />
          {t('whiteboard.upload-file')}
        </button>
      </>
    );
  };

  return <>{render()}</>;
};

export default UploadFilesUI;
