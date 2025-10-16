import React, { useEffect, useState } from 'react';
import {
  GetRoomUploadedFilesReqSchema,
  GetRoomUploadedFilesResSchema,
  RoomUploadedFileMetadata,
  RoomUploadedFileType,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { useAppSelector } from '../../../store';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { LoadingIcon } from '../../../assets/Icons/Loading';
import { FileIconSVG } from '../../../assets/Icons/FileIconSVG';

interface IUploadedFileListProps {
  newlyUploadedFile?: RoomUploadedFileMetadata;
  selectedFile?: RoomUploadedFileMetadata;
  onFileSelect(file: RoomUploadedFileMetadata): void;
}

const UploadedFileList = ({
  newlyUploadedFile,
  selectedFile,
  onFileSelect,
}: IUploadedFileListProps) => {
  const session = useAppSelector((state) => state.session);
  const [uploadedFiles, setUploadedFiles] = useState<
    RoomUploadedFileMetadata[]
  >([]);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  useEffect(() => {
    const fetchFiles = async () => {
      setIsFetching(true);
      const body = create(GetRoomUploadedFilesReqSchema, {
        roomId: session.currentRoom.roomId,
        fileType: RoomUploadedFileType.EXTERNAL_MEDIA_PLAYER_FILE,
      });
      const r = await sendAPIRequest(
        'getRoomFilesByType',
        toBinary(GetRoomUploadedFilesReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(GetRoomUploadedFilesResSchema, new Uint8Array(r));
      if (res.status && res.files) {
        setUploadedFiles(res.files);
      }
      setIsFetching(false);
    };
    fetchFiles().then();
    //eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (newlyUploadedFile) {
      setUploadedFiles([...uploadedFiles, newlyUploadedFile]);
    }
    //eslint-disable-next-line
  }, [newlyUploadedFile]);

  if (isFetching) {
    return (
      <div className="flex justify-center mt-12">
        <LoadingIcon
          className="h-10 w-10 animate-spin text-gray-200"
          fillColor="#004D90"
        />
      </div>
    );
  }

  if (!uploadedFiles.length) {
    return null;
  }

  return (
    <div className="max-h-40 overflow-y-auto scrollBar grid gap-2 mt-12">
      {uploadedFiles.map((file) => {
        const isSelectedInModal = selectedFile?.fileId === file.fileId;
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
            onClick={() => onFileSelect(file)}
          >
            <div className="icon w-9 h-9 rounded-full bg-Gray-100 text-Blue2-800 relative inline-flex items-center justify-center">
              <FileIconSVG />
            </div>
            <div className="text flex-1 text-Gray-800 text-sm">
              <p className="break-all">{file.fileName}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UploadedFileList;
