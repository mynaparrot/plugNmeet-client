import React, { useState } from 'react';
import {
  RoomUploadedFileMetadata,
  RoomUploadedFileMetadataSchema,
  RoomUploadedFileType,
} from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import UploadFile from './UploadFile';
import UploadedFileList from './UploadedFileList';

interface UploadProps {
  isPlayBtnLoading: boolean;
  setSelectedUrl: React.Dispatch<React.SetStateAction<string>>;
}

const Upload = ({ setSelectedUrl, isPlayBtnLoading }: UploadProps) => {
  const [newlyUploadedFile, setNewlyUploadedFile] =
    useState<RoomUploadedFileMetadata>();
  const [selectedFile, setSelectedFile] = useState<RoomUploadedFileMetadata>();

  const onAfterFileUploaded = (
    fileId: string,
    fileName: string,
    filePath: string,
  ) => {
    const newFile: RoomUploadedFileMetadata = create(
      RoomUploadedFileMetadataSchema,
      {
        fileId,
        fileName,
        filePath,
        fileType: RoomUploadedFileType.EXTERNAL_MEDIA_PLAYER_FILE,
      },
    );
    setNewlyUploadedFile(newFile);
    // select the newly uploaded file.
    setSelectedFile(newFile);
    onFileSelectFromList(newFile);
  };

  const onFileSelectedForUpload = () => {
    // if a file was selected from the list, unselect it
    // as we are now in upload mode.
    setSelectedFile(undefined);
    setSelectedUrl('');
  };

  const onFileSelectFromList = (file: RoomUploadedFileMetadata) => {
    setSelectedFile(file);

    const playbackUrl =
      (window as any).PLUG_N_MEET_SERVER_URL +
      '/download/uploadedFile/' +
      file.filePath;
    setSelectedUrl(playbackUrl);
  };

  return (
    <>
      <UploadFile
        isPlayBtnLoading={isPlayBtnLoading}
        onAfterFileUploaded={onAfterFileUploaded}
        onFileSelectedForUpload={onFileSelectedForUpload}
      />
      <UploadedFileList
        newlyUploadedFile={newlyUploadedFile}
        selectedFile={selectedFile}
        onFileSelect={onFileSelectFromList}
      />
    </>
  );
};

export default Upload;
