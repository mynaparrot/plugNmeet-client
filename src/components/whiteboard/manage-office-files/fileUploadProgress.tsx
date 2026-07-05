import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useTranslation } from 'react-i18next';

import officeFileProcessor, {
  IOfficeFileProcessing,
  OfficeFileStatus,
} from './officeFileProcessor';
import { FileIconSVG } from '../../../assets/Icons/FileIconSVG';
import { TrashSVG } from '../../../assets/Icons/TrashSVG';

interface FileUploadProgressProps {
  excalidrawAPI: ExcalidrawImperativeAPI;
  allowedFileTypes: string[];
  maxAllowedFileSize: string;
  file?: File;
  setDisableUploading: Dispatch<SetStateAction<boolean>>;
  onUploadFinished: () => void;
}
type message = {
  isError: boolean;
  msg: string;
};

interface ICurrentFile {
  name: string;
  size: number;
}

const FileUploadProgress = ({
  excalidrawAPI,
  allowedFileTypes,
  maxAllowedFileSize,
  file,
  setDisableUploading,
  onUploadFinished,
}: FileUploadProgressProps) => {
  const { t } = useTranslation();

  const [uploadingProgress, setUploadingProgress] = useState<number>(0);
  const [message, setMessage] = useState<message | undefined>(undefined);
  const [currentFile, setCurrentFile] = useState<ICurrentFile | undefined>(
    undefined,
  );
  const [status, setStatus] = useState<OfficeFileStatus>('idle');

  const cleanupProcess = useCallback(() => {
    onUploadFinished();
    setDisableUploading(false);
    setCurrentFile(undefined);
    setMessage(undefined);
  }, [onUploadFinished, setDisableUploading]);

  useEffect(() => {
    const callbacks: IOfficeFileProcessing = {
      onStart: () => {
        setDisableUploading(true);
        setStatus('uploading');
      },
      onProgress: (p) => {
        setUploadingProgress(p);
        if (p === 100) {
          setStatus('converting');
        }
      },
      onSuccess: (msg) => {
        setMessage({ isError: false, msg: msg });
        cleanupProcess();
      },
      onError: (msg) => {
        setMessage({ isError: true, msg: msg });
      },
    };

    if (officeFileProcessor.isBusy) {
      setDisableUploading(true);
      const ps = officeFileProcessor.status;
      setCurrentFile({ name: ps.fileName, size: ps.fileSize });
      setStatus(ps.status);
      setUploadingProgress(ps.progress);
      officeFileProcessor.registerCallbacks(callbacks);
    } else if (file) {
      setCurrentFile(file);
      // if no file is processing, start one for the current file
      officeFileProcessor.start(
        file,
        excalidrawAPI,
        allowedFileTypes,
        maxAllowedFileSize,
        callbacks,
      );
    }

    return () => {
      officeFileProcessor.unregisterCallbacks();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, cleanupProcess]);

  const handleDelete = useCallback(() => {
    if (!officeFileProcessor.isBusy) {
      cleanupProcess();
    }
  }, [cleanupProcess]);

  const renderProgressBar = () => {
    if (message) {
      return (
        <p
          className={`text-xs pt-0.5 ${
            message.isError ? 'text-red-500' : 'text-green-500'
          }`}
        >
          {message.msg}
        </p>
      );
    }

    if (status === 'converting') {
      return (
        <p className="text-xs pt-0.5 text-green-500">
          {t('whiteboard.converting')}
        </p>
      );
    }

    return (
      <>
        <div className="bar h-2 w-full relative bg-Gray-25 rounded-full overflow-hidden">
          <div
            className="inner gradient absolute w-full h-full top-0 left-0"
            style={{ width: `${uploadingProgress}%` }}
          ></div>
        </div>
        <div className="count bg-Gray-25 dark:bg-dark-primary border border-Gray-300 dark:border-Gray-800 rounded-[7px] w-auto py-0.5 px-2">
          {uploadingProgress}%
        </div>
      </>
    );
  };

  return (
    currentFile && (
      <div
        className={`flex gap-4 py-2 px-3 bg-Gray-50 dark:bg-dark-primary w-full rounded-xl ${
          message && message.isError ? 'border border-Red-400' : ''
        }`}
      >
        <div className="icon w-9 h-9 rounded-full  dark:bg-Gray-700 text-Blue2-800 dark:text-white relative inline-flex items-center justify-center">
          <FileIconSVG />
        </div>
        <div className="text flex-1 text-Gray-800 dark:text-white text-sm">
          <div className="top flex gap-3 justify-between">
            <div className="left">
              <p className="break-all">{currentFile.name}</p>
              <div className="bottom flex justify-between text-Gray-800 dark:text-white text-xs items-center pt-1">
                {(currentFile.size / (1024 * 1024)).toFixed(2)}MB
              </div>
            </div>
            {message && message.isError && (
              <div className="right cursor-pointer" onClick={handleDelete}>
                <TrashSVG />
              </div>
            )}
          </div>
          <div className="progress-bar flex gap-2 items-center">
            {renderProgressBar()}
          </div>
        </div>
      </div>
    )
  );
};

export default FileUploadProgress;
