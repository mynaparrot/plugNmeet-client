import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GetRoomUploadedFilesReqSchema,
  GetRoomUploadedFilesResSchema,
  RoomUploadedFileType,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

import { useAppSelector } from '../../../store';
import { FileIconSVG } from '../../../assets/Icons/FileIconSVG';
import {
  IWhiteboardOfficeFile,
  WhiteboardFileConversionRes,
} from '../../../store/slices/interfaces/whiteboard';
import { SelectedIcon } from '../../../assets/Icons/SelectedIcon';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { createAndRegisterOfficeFile } from '../helpers/handleFiles';

interface UploadedFilesListProps {
  roomId: string;
  excalidrawAPI: ExcalidrawImperativeAPI;
  onSelectOfficeFile: (fileId: IWhiteboardOfficeFile) => void;
  selectedOfficeFile?: IWhiteboardOfficeFile;
}

const UploadedFilesList = ({
  roomId,
  excalidrawAPI,
  onSelectOfficeFile,
  selectedOfficeFile,
}: UploadedFilesListProps) => {
  const { t } = useTranslation();
  const isFetched = useRef(false);

  const whiteboardUploadedOfficeFiles = useAppSelector(
    (state) => state.whiteboard.whiteboardUploadedOfficeFiles,
  );
  const currentWhiteboardOfficeFileId = useAppSelector(
    (state) => state.whiteboard.currentWhiteboardOfficeFileId,
  );

  useEffect(() => {
    const fetchAndUpdateFiles = async () => {
      const body = create(GetRoomUploadedFilesReqSchema, {
        roomId: roomId,
        fileType: RoomUploadedFileType.WHITEBOARD_CONVERTED_FILE,
      });
      const r = await sendAPIRequest(
        'getRoomFilesByType',
        toBinary(GetRoomUploadedFilesReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(GetRoomUploadedFilesResSchema, new Uint8Array(r));
      if (!res.status || !res.files) {
        return;
      }

      // let's compare with local store
      res.files.forEach((file) => {
        const exist = whiteboardUploadedOfficeFiles.find(
          (f) => f.fileId === file.fileId,
        );
        if (!exist) {
          const newFile: WhiteboardFileConversionRes = {
            msg: '',
            status: true,
            fileId: file.fileId,
            fileName: file.fileName,
            filePath: file.filePath,
            totalPages: file.totalPages ?? 0,
          };
          createAndRegisterOfficeFile(
            newFile,
            excalidrawAPI.getAppState().height,
            excalidrawAPI.getAppState().width,
          );
        }
      });
    };

    if (!isFetched.current) {
      isFetched.current = true;
      fetchAndUpdateFiles().then();
    }
    // oxlint-disable-next-line exhaustive-deps
  }, []);

  return (
    <div className="max-h-40 overflow-y-auto scrollBar grid gap-2">
      {whiteboardUploadedOfficeFiles.map((file) => {
        const isCurrentlyInUse = currentWhiteboardOfficeFileId === file.fileId;
        const isSelectedInModal = selectedOfficeFile?.fileId === file.fileId;

        let classNames =
          'flex gap-4 py-2 px-3 w-full rounded-xl cursor-pointer transition-all duration-200';
        if (isSelectedInModal) {
          classNames += ' border-2 border-Blue2-500 bg-Blue2-50';
        } else {
          classNames += ' border border-Gray-100 bg-white hover:bg-Gray-50';
        }

        return (
          <div
            key={file.fileId}
            className={classNames}
            onClick={() => onSelectOfficeFile(file)}
          >
            <div className="icon w-9 h-9 rounded-full bg-Gray-100 text-Blue2-800 relative inline-flex items-center justify-center">
              <FileIconSVG />
            </div>
            <div className="text flex-1 text-Gray-800 text-sm">
              <div className="top flex gap-3 justify-between">
                <div className="left">
                  <p className="break-all">{file.fileName}</p>
                </div>
                <div className="right">
                  {isCurrentlyInUse && <SelectedIcon />}
                </div>
              </div>
              <div className="progress-bar flex gap-2 items-center text-xs pt-0.5">
                {t('whiteboard.total-pages', {
                  count: file.totalPages,
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UploadedFilesList;
