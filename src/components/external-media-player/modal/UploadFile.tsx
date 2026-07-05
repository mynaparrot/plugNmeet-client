import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FileIconSVG } from '../../../assets/Icons/FileIconSVG';
import { TrashSVG } from '../../../assets/Icons/TrashSVG';
import externalMediaProcessor, {
  IExternalMediaUploadCallbacks,
} from './externalMediaProcessor';

interface IUploadFileProps {
  isPlayBtnLoading: boolean;
  onAfterFileUploaded(fileId: string, fileName: string, filePath: string): void;
  onFileSelectedForUpload(file: File): void;
}

const ALLOWED_FILE_TYPES = ['mp4', 'mp3', 'webm'];

const UploadFile = ({
  isPlayBtnLoading,
  onAfterFileUploaded,
  onFileSelectedForUpload,
}: IUploadFileProps) => {
  const { t } = useTranslation();
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadingProgress, setUploadingProgress] = useState<number>(0);
  const [error, setError] = useState<string | undefined>();

  // Setup processor hook and restore connection if active background upload exists
  useEffect(() => {
    const callbacks: IExternalMediaUploadCallbacks = {
      onStart: () => {
        setIsUploading(true);
        setError(undefined);
      },
      onProgress: (progress) => {
        setUploadingProgress(progress);
      },
      onSuccess: (fileId, fileName, filePath) => {
        onAfterFileUploaded(fileId, fileName, filePath);
        setFileName('');
        setFileSize(0);
        setIsUploading(false);
      },
      onError: (errorMsg) => {
        setError(errorMsg);
        setIsUploading(false);
      },
    };

    if (externalMediaProcessor.isBusy) {
      // A background upload is already active. Let's hook into it!
      const activeStatus = externalMediaProcessor.status;
      setFileName(activeStatus.fileName);
      setFileSize(activeStatus.fileSize);
      setUploadingProgress(activeStatus.progress);
      setIsUploading(activeStatus.status === 'uploading');
      externalMediaProcessor.registerCallbacks(callbacks);
    }

    return () => {
      externalMediaProcessor.unregisterCallbacks();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length) {
        const selectedFile = selectedFiles[0];
        setFileName(selectedFile.name);
        setFileSize(selectedFile.size);
        onFileSelectedForUpload(selectedFile);

        const callbacks: IExternalMediaUploadCallbacks = {
          onStart: () => {
            setIsUploading(true);
            setError(undefined);
          },
          onProgress: (progress) => {
            setUploadingProgress(progress);
          },
          onSuccess: (fileId, name, filePath) => {
            onAfterFileUploaded(fileId, name, filePath);
            setFileName('');
            setFileSize(0);
            setIsUploading(false);
          },
          onError: (errorMsg) => {
            setError(errorMsg);
            setIsUploading(false);
          },
        };

        externalMediaProcessor.start(
          selectedFile,
          ALLOWED_FILE_TYPES,
          callbacks,
        );
      }
    },
    [onFileSelectedForUpload, onAfterFileUploaded],
  );

  const handleReset = useCallback(() => {
    externalMediaProcessor.reset();
    setFileName('');
    setFileSize(0);
    setIsUploading(false);
    setUploadingProgress(0);
    setError(undefined);
  }, []);

  return (
    <div className="upload-area relative min-h-20 mt-2.5 mb-4">
      {!fileName ? (
        <>
          <div className="absolute -bottom-7 text-sm font-medium text-Gray-800">
            {t('footer.modal.external-media-player-upload-supported-files', {
              files: ALLOWED_FILE_TYPES.map((type) => '.' + type).join(', '),
            })}
          </div>
          <input
            type="file"
            id="media-file"
            accept={ALLOWED_FILE_TYPES.map((type) => '.' + type).join(',')}
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
                <p className="break-all">{fileName}</p>
                <div className="bottom flex justify-between text-Gray-800 text-xs items-center pt-1">
                  {fileSize > 0
                    ? `${(fileSize / (1024 * 1024)).toFixed(2)}MB`
                    : ''}
                </div>
              </div>
              <div
                className="right cursor-pointer"
                onClick={() => !isUploading && handleReset()}
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
