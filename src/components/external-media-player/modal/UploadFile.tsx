import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RoomUploadedFileType } from 'plugnmeet-protocol-js';

import { uploadResumableFile } from '../../../helpers/fileUpload';
import { FileIconSVG } from '../../../assets/Icons/FileIconSVG';
import { TrashSVG } from '../../../assets/Icons/TrashSVG';

interface IUploadFileProps {
  isPlayBtnLoading: boolean;
  onAfterFileUploaded(fileId: string, fileName: string, filePath: string): void;
  onFileSelectedForUpload(file: File): void;
}

const UploadFile = ({
  isPlayBtnLoading,
  onAfterFileUploaded,
  onFileSelectedForUpload,
}: IUploadFileProps) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | undefined>();
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadingProgress, setUploadingProgress] = useState<number>(0);
  const [error, setError] = useState<string | undefined>();
  const allowedFileTypes = ['mp4', 'mp3', 'webm'];

  useEffect(() => {
    if (!file) {
      return;
    }

    uploadResumableFile(
      allowedFileTypes,
      undefined,
      RoomUploadedFileType.EXTERNAL_MEDIA_PLAYER_FILE,
      [file],
      (result) => {
        onAfterFileUploaded(result.fileId, result.fileName, result.filePath);
        setFile(undefined);
      },
      (isUploading) => setIsUploading(isUploading),
      (progress) => setUploadingProgress(Math.round(progress * 100)),
      (errorMsg) => setError(errorMsg),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length) {
      const file = selectedFiles[0];
      setFile(file);
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
      {!file ? (
        <>
          <input
            type="file"
            id="media-file"
            accept={allowedFileTypes.map((type) => '.' + type).join(',')}
            onChange={onChange}
            className="absolute left-0 w-full h-full top-0 opacity-0 cursor-pointer"
            disabled={isPlayBtnLoading}
          />
          <label
            htmlFor="media-file"
            className="w-full h-full py-7 px-5 border border-dashed border-Blue cursor-pointer rounded-sm focus:shadow-input-focus flex items-center justify-center text-center text-Gray-800"
          >
            {t('footer.modal.external-media-player-select-file')}
          </label>
        </>
      ) : (
        <div
          className={`flex gap-4 py-2 px-3 bg-Gray-50 w-full rounded-xl ${
            error ? 'border border-Red-400' : ''
          }`}
        >
          <div className="icon w-9 h-9 rounded-full bg-Gray-100 text-Blue2-800 relative inline-flex items-center justify-center">
            <FileIconSVG />
          </div>
          <div className="text flex-1 text-Gray-800 text-sm">
            <div className="top flex gap-3 justify-between">
              <div className="left">
                <p className="break-all">{file.name}</p>
                <div className="bottom flex justify-between text-Gray-800 text-xs items-center pt-1">
                  {Math.round(file.size / 1000)}KB
                </div>
              </div>
              <div
                className="right cursor-pointer"
                onClick={() => !isUploading && setFile(undefined)}
              >
                <TrashSVG />
              </div>
            </div>
            <div className="progress-bar flex gap-2 items-center">
              <div className="bar h-2 w-full relative bg-Gray-25 rounded-full overflow-hidden">
                <div
                  className="inner gradient absolute w-full h-full top-0 left-0"
                  style={{ width: `${uploadingProgress}%` }}
                ></div>
              </div>
              <div className="count bg-Gray-25 border border-Gray-300 rounded-[7px] w-auto py-0.5 px-2">
                {uploadingProgress}%
              </div>
            </div>
            {error && <p className="text-xs pt-0.5 text-red-500">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadFile;
