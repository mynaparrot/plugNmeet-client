import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  CommonResponseSchema,
  ExternalMediaPlayerReqSchema,
  ExternalMediaPlayerTask,
  RoomUploadedFileMetadata,
  RoomUploadedFileMetadataSchema,
  RoomUploadedFileType,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import sendAPIRequest from '../../../../helpers/api/plugNmeetAPI';
import { updateShowExternalMediaPlayerModal } from '../../../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch } from '../../../../store';
import ActionButton from '../../../../helpers/ui/actionButton';
import UploadFile from './UploadFile';
import UploadedFileList from './UploadedFileList';

const Upload = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const [newlyUploadedFile, setNewlyUploadedFile] =
    useState<RoomUploadedFileMetadata>();
  const [selectedFile, setSelectedFile] = useState<RoomUploadedFileMetadata>();
  const [fileToUpload, setFileToUpload] = useState<File>();

  const isFileSelectedForUpload = fileToUpload !== undefined;
  const isFileSelectedFromList = selectedFile !== undefined;
  const [isPlayBtnLoading, setIsPlayBtnLoading] = useState<boolean>(false);

  const onFileUploaded = (
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
    setFileToUpload(undefined);
    // select the newly uploaded file.
    setSelectedFile(newFile);
  };

  const onFileSelectedForUpload = (file: File) => {
    setFileToUpload(file);
    // if a file was selected from the list, unselect it
    // as we are now in upload mode.
    setSelectedFile(undefined);
  };

  const onFileSelectFromList = (file: RoomUploadedFileMetadata) => {
    setSelectedFile(file);
    // unselect file to upload
    setFileToUpload(undefined);
  };

  const handlePlay = () => {
    if (selectedFile) {
      startPlayback(selectedFile);
    }
  };

  const startPlayback = async (file: RoomUploadedFileMetadata) => {
    if (!file) {
      return;
    }

    setIsPlayBtnLoading(true);
    const id = toast.loading(t('footer.notice.external-media-player-starting'));

    const playbackUrl =
      (window as any).PLUG_N_MEET_SERVER_URL +
      '/download/uploadedFile/' +
      file.filePath;

    const body = create(ExternalMediaPlayerReqSchema, {
      task: ExternalMediaPlayerTask.START_PLAYBACK,
      url: playbackUrl,
    });
    const r = await sendAPIRequest(
      'externalMediaPlayer',
      toBinary(ExternalMediaPlayerReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (!res.status) {
      toast.update(id, {
        render: t(res.msg),
        type: 'error',
        isLoading: false,
        autoClose: 1000,
      });
    }
    toast.dismiss(id);
    setIsPlayBtnLoading(false);
    dispatch(updateShowExternalMediaPlayerModal(false));
  };

  return (
    <>
      <UploadFile
        isPlayBtnLoading={isPlayBtnLoading}
        onFileUploaded={onFileUploaded}
        onFileSelectedForUpload={onFileSelectedForUpload}
      />
      <UploadedFileList
        newlyUploadedFile={newlyUploadedFile}
        selectedFile={selectedFile}
        onFileSelect={onFileSelectFromList}
      />

      <div className="mt-8 flex justify-end">
        <ActionButton
          isLoading={isPlayBtnLoading}
          disabled={!isFileSelectedForUpload && !isFileSelectedFromList}
          onClick={handlePlay}
        >
          {t('footer.modal.external-media-player-play')}
        </ActionButton>
      </div>
    </>
  );
};

export default Upload;
