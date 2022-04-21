import React, { useRef, useState } from 'react';
import Resumable from 'resumablejs';
import ResumableFile = Resumable.ResumableFile;
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch } from '../../store';
import { ISession } from '../../store/slices/interfaces/session';
import { IWhiteboardFile } from '../../store/slices/interfaces/whiteboard';
import { addWhiteboardFile } from '../../store/slices/whiteboard';
import {
  DataMessageType,
  IDataMessage,
  WhiteboardMsg,
  WhiteboardMsgType,
} from '../../store/slices/interfaces/dataMessages';
import { sendWebsocketMessage } from '../../helpers/websocket';
import { randomString } from '../../helpers/utils';

interface IUploadFilesProps {
  currenPage: number;
}

const UploadFiles = ({ currenPage }: IUploadFilesProps) => {
  const inputFile = useRef<HTMLInputElement>(null);
  const toastId = React.useRef<string>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

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
    const session = store.getState().session;
    sendFile(session, files);
  };

  const broadcastFile = (filePath, fileName) => {
    const file: IWhiteboardFile = {
      id: randomString(),
      currenPage,
      filePath,
      fileName,
    };
    dispatch(addWhiteboardFile(file));

    const files = store.getState().whiteboard.whiteboardFiles;
    const session = store.getState().session;

    const info: WhiteboardMsg = {
      type: WhiteboardMsgType.ADD_WHITEBOARD_FILE,
      from: {
        sid: session.currenUser?.sid ?? '',
        userId: session.currenUser?.userId ?? '',
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

  const sendFile = (session: ISession, files: Array<File>) => {
    let fileName = '';

    const r = new Resumable({
      target: (window as any).PLUG_N_MEET_SERVER_URL + '/api/fileUpload',
      uploadMethod: 'POST',
      query: {
        sid: session.currentRoom.sid,
        roomId: session.currentRoom.room_id,
        userId: session.currenUser?.userId,
        resumable: true,
      },
      headers: {
        Authorization: session.token,
      },
      fileType: ['jpg', 'jpeg', 'png', 'svg'],
      fileTypeErrorCallback(file) {
        toast(t('notifications.file-type-not-allow', { filetype: file.type }), {
          type: toast.TYPE.ERROR,
        });
      },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      maxFileSize: 2 * 1000000,
      maxFileSizeErrorCallback() {
        toast(t('notifications.max-file-size-exceeds'), {
          type: toast.TYPE.ERROR,
        });
      },
    });

    r.on('fileAdded', function (file) {
      fileName = file.fileName;
      if (!r.isUploading()) {
        setIsUploading(true);
        r.upload();
      }
    });

    r.on('fileSuccess', function (file: ResumableFile, message: string) {
      const res = JSON.parse(message);
      setIsUploading(false);

      setTimeout(() => {
        toast.dismiss(toastId.current ?? '');
      }, 300);

      if (res.status) {
        broadcastFile(res.filePath, res.fileName);
        toast(t('right-panel.file-upload-success'), {
          type: toast.TYPE.SUCCESS,
        });
      }
    });

    r.on('fileError', function (file, message) {
      const res = JSON.parse(message);
      setIsUploading(false);

      setTimeout(() => {
        toast.dismiss(toastId.current ?? '');
      }, 300);

      toast(t(res.msg), {
        type: toast.TYPE.ERROR,
      });
    });

    r.on('uploadStart', function () {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      toastId.current = toast(
        t('right-panel.uploading-file', {
          fileName,
        }),
        {
          closeButton: false,
          progress: 0,
        },
      );
    });

    r.on('fileProgress', function (file) {
      const progress = file.progress(false);
      toast.update(toastId.current ?? '', {
        progress: Number(progress),
      });
    });

    r.addFiles(files);
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
          accept=".png,.jpg,.jpeg,.svg"
        />
        <button
          disabled={isUploading}
          onClick={() => openFileBrowser()}
          className="w-10 h-7 flex items-center justify-center"
        >
          <i className="pnm-attachment primaryColor text-[14px] opacity-50" />
        </button>
      </>
    );
  };

  return <>{render()}</>;
};

export default UploadFiles;
