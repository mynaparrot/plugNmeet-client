import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Room } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import Resumable from 'resumablejs';
import ResumableFile = Resumable.ResumableFile;

import { store } from '../../../store';
import { ISession } from '../../../store/slices/interfaces/session';
import {
  isSocketConnected,
  sendWebsocketMessage,
} from '../../../helpers/websocketConnector';
import {
  DataMessageType,
  IChatMsg,
  IDataMessage,
} from '../../../store/slices/interfaces/dataMessages';

interface IFileSendProps {
  isChatServiceReady: boolean;
  lockSendFile: boolean;
  currentRoom: Room;
}

const FileSend = ({
  isChatServiceReady,
  lockSendFile,
  currentRoom,
}: IFileSendProps) => {
  const inputFile = useRef<HTMLInputElement>(null);
  const toastId = React.useRef<string>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const { t } = useTranslation();

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
        toast.done(toastId.current ?? '');
      }, 300);

      if (res.status) {
        publishToChat(res.filePath, res.fileName);
        toast(t('right-panel.file-upload-success'), {
          type: toast.TYPE.SUCCESS,
        });
      }
    });

    r.on('fileError', function (file, message) {
      const res = JSON.parse(message);
      setIsUploading(false);

      setTimeout(() => {
        toast.done(toastId.current ?? '');
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

  const publishToChat = (filePath: string, fileName: string) => {
    if (!isSocketConnected()) {
      return;
    }

    const message = `<a href="${
      (window as any).PLUG_N_MEET_SERVER_URL + '/download/chat/' + filePath
    }" target="_blank">${fileName}</a>`;

    const info: IChatMsg = {
      type: 'CHAT',
      isPrivate: false,
      time: '',
      message_id: '',
      from: {
        sid: currentRoom.localParticipant.sid,
        userId: currentRoom.localParticipant.identity,
        name: currentRoom.localParticipant.name,
      },
      msg: message,
    };

    const data: IDataMessage = {
      type: DataMessageType.USER,
      room_sid: currentRoom.sid,
      message_id: '',
      body: info,
    };

    sendWebsocketMessage(JSON.stringify(data));
  };

  const render = () => {
    return (
      <React.Fragment>
        <input
          type="file"
          id="chat-file"
          ref={inputFile}
          style={{ display: 'none' }}
          onChange={(e) => onChange(e)}
        />
        <button
          disabled={!isChatServiceReady || lockSendFile || isUploading}
          onClick={() => openFileBrowser()}
          className="w-4 h-6 px-2"
        >
          <i className="pnm-attachment brand-color1 text-[20px] opacity-50" />
        </button>
      </React.Fragment>
    );
  };

  return <React.Fragment>{render()}</React.Fragment>;
};

export default FileSend;
