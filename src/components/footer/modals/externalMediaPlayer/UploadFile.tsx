import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RoomUploadedFileType } from 'plugnmeet-protocol-js';

import useResumableFilesUpload from '../../../../helpers/hooks/useResumableFilesUpload';

interface IUploadFileProps {
  isPlayBtnLoading: boolean;
  onFileUploaded(fileId: string, fileName: string, filePath: string): void;
  onFileSelectedForUpload(file: File): void;
}

const UploadFile = ({
  isPlayBtnLoading,
  onFileUploaded,
  onFileSelectedForUpload,
}: IUploadFileProps) => {
  const { t } = useTranslation();
  const [files, setFiles] = useState<Array<File>>();
  const allowedFileTypes = ['mp4', 'mp3', 'webm'];

  const { isUploading, result } = useResumableFilesUpload({
    allowedFileTypes: allowedFileTypes,
    maxFileSize: undefined,
    files,
    fileType: RoomUploadedFileType.EXTERNAL_MEDIA_PLAYER_FILE,
  });

  useEffect(() => {
    if (result && result.filePath) {
      onFileUploaded(result.fileId, result.fileName, result.filePath);
      // and clear the file input
      setFiles(undefined);
    }
    //eslint-disable-next-line
  }, [result]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length) {
      const file = selectedFiles[0];
      setFiles([file]);
      onFileSelectedForUpload(file);
    }
  };

  return (
    <div className="upload-area relative h-20 mt-2.5 mb-4">
      <div className="absolute -bottom-7 text-sm font-medium text-Gray-800">
        {t('footer.modal.external-media-player-upload-supported-files', {
          files: allowedFileTypes.map((type) => '.' + type).join(', '),
        })}
      </div>
      <input
        type="file"
        id="media-file"
        accept={allowedFileTypes.map((type) => '.' + type).join(',')}
        onChange={onChange}
        className="absolute left-0 w-full h-full top-0 opacity-0 cursor-pointer"
        disabled={isUploading || isPlayBtnLoading}
      />
      <label
        htmlFor="media-file"
        className="w-full h-full py-7 px-5 border border-dashed border-Blue cursor-pointer rounded-sm focus:shadow-input-focus flex items-center justify-center text-center text-Gray-800"
      >
        {isUploading
          ? t('footer.modal.external-media-player-uploading')
          : (files?.[0].name ??
            t('footer.modal.external-media-player-select-file'))}
      </label>
    </div>
  );
};

export default UploadFile;
