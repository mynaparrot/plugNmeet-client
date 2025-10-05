import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import {
  AnalyticsEvents,
  AnalyticsEventType,
  RoomUploadedFileType,
} from 'plugnmeet-protocol-js';

import { FileIconSVG } from '../../../assets/Icons/FileIconSVG';
import { TrashSVG } from '../../../assets/Icons/TrashSVG';
import { sleep } from '../../../helpers/utils';
import { store } from '../../../store';
import { getNatsConn } from '../../../helpers/nats';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import {
  WhiteboardFileConversionReq,
  WhiteboardFileConversionRes,
} from '../../../store/slices/interfaces/whiteboard';
import { createAndRegisterOfficeFile } from '../helpers/handleFiles';
import { uploadResumableFile } from '../../../helpers/fileUpload';

interface FileUploadProgressProps {
  excalidrawAPI: ExcalidrawImperativeAPI;
  allowedFileTypes: string[];
  maxAllowedFileSize: string;
  file: File;
  setDisableUploading: Dispatch<SetStateAction<boolean>>;
}
type message = {
  isError: boolean;
  msg: string;
};
const FileUploadProgress = ({
  excalidrawAPI,
  allowedFileTypes,
  maxAllowedFileSize,
  file,
  setDisableUploading,
}: FileUploadProgressProps) => {
  const { t } = useTranslation();
  const conn = getNatsConn();

  const { roomSid, roomId, userId } = useMemo(() => {
    const { currentRoom, currentUser } = store.getState().session;
    return {
      roomSid: currentRoom.sid,
      roomId: currentRoom.roomId,
      userId: currentUser?.userId,
    };
  }, []);

  const [uploadingProgress, setUploadingProgress] = useState<number>(0);
  const [message, setMessage] = useState<message | undefined>(undefined);
  const [removeView, setRemoveView] = useState<boolean>(false);
  const [isWorking, setIsWorking] = useState<boolean>(false);
  const uploadInitiated = useRef(false);

  useEffect(() => {
    setDisableUploading(isWorking);
    // oxlint-disable-next-line exhaustive-deps
  }, [isWorking]);

  useEffect(() => {
    if (uploadInitiated.current) {
      return;
    }
    uploadInitiated.current = true;
    const files: File[] = [file];

    uploadResumableFile(
      allowedFileTypes,
      maxAllowedFileSize,
      RoomUploadedFileType.WHITEBOARD_CONVERTED_FILE,
      files,
      (result) => convertFile(result.filePath),
      (isUploading) => setIsWorking(isUploading),
      (uploadProgress) =>
        setUploadingProgress(Math.round(uploadProgress * 100)),
      (errMsg) => setMessage({ isError: true, msg: errMsg }),
    );
    // oxlint-disable-next-line
  }, [uploadInitiated, file]);

  const convertFile = async (filePath: string) => {
    const id = toast.loading(t('whiteboard.converting'), {
      type: 'info',
    });
    setMessage({ isError: false, msg: t('whiteboard.converting') });
    setIsWorking(true);
    const body: WhiteboardFileConversionReq = {
      roomSid: roomSid,
      roomId: roomId,
      userId: userId ?? '',
      filePath: filePath,
    };

    const res: WhiteboardFileConversionRes = await sendAPIRequest(
      'convertWhiteboardFile',
      body,
    );
    if (!res.status) {
      setMessage({ isError: true, msg: t(res.msg) });
      setIsWorking(false);
      toast.update(id, {
        render: t(res.msg),
        type: 'error',
        isLoading: false,
        closeButton: true,
      });
      return;
    }

    const newFile = createAndRegisterOfficeFile(
      res,
      excalidrawAPI.getAppState().height,
      excalidrawAPI.getAppState().width,
    );

    // send analytics
    conn.sendAnalyticsData(
      AnalyticsEvents.ANALYTICS_EVENT_USER_WHITEBOARD_FILES,
      AnalyticsEventType.USER,
      newFile.fileName,
    );
    conn.sendAnalyticsData(
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
    setMessage({ isError: false, msg: t('whiteboard.file-ready') });
    await sleep(1000);
    setRemoveView(true);
    setIsWorking(false);
  };

  const handleDelete = useCallback(() => {
    if (!isWorking) {
      setRemoveView(true);
    }
  }, [isWorking]);

  return (
    !removeView && (
      <div
        className={`flex gap-4 py-2 px-3 bg-Gray-50 w-full rounded-xl ${message && message.isError ? 'border border-Red-400' : ''}`}
      >
        <div className="icon w-9 h-9 rounded-full bg-Gray-100 text-Blue2-800 relative inline-flex items-center justify-center">
          <FileIconSVG />
        </div>
        <div className="text flex-1 text-Gray-800 text-sm">
          <div className="top flex gap-3 justify-between">
            <div className="left">
              <p className="break-all">{file.name}</p>
              <div className="bottom flex justify-between text-Gray-800 text-xs items-center pt-1">
                {file.size}KB
              </div>
            </div>
            <div className="right cursor-pointer" onClick={handleDelete}>
              <TrashSVG />
            </div>
          </div>
          <div className="progress-bar flex gap-2 items-center">
            {message ? (
              <p
                className={`text-xs pt-0.5 ${message.isError ? 'text-red-500' : 'text-green-500'}`}
              >
                {message.msg}
              </p>
            ) : (
              <>
                <div className="bar h-2 w-full relative bg-Gray-25 rounded-full overflow-hidden">
                  <div
                    className="inner gradient absolute w-full h-full top-0 left-0"
                    style={{ width: `${uploadingProgress}%` }}
                  ></div>
                </div>
                <div className="count bg-Gray-25 border border-Gray-300 rounded-[7px] w-auto py-0.5 px-2">
                  {uploadingProgress}%
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  );
};

export default FileUploadProgress;
