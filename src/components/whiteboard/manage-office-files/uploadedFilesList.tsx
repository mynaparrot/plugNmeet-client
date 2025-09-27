import React from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../../store';
import { FileIconSVG } from '../../../assets/Icons/FileIconSVG';
import { IWhiteboardOfficeFile } from '../../../store/slices/interfaces/whiteboard';
import { SelectedIcon } from '../../../assets/Icons/SelectedIcon';

interface UploadedFilesListProps {
  onSelectOfficeFile: (fileId: IWhiteboardOfficeFile) => void;
  selectedFileId?: string;
}

const UploadedFilesList = ({
  onSelectOfficeFile,
  selectedFileId,
}: UploadedFilesListProps) => {
  const { t } = useTranslation();
  const whiteboardUploadedOfficeFiles = useAppSelector(
    (state) => state.whiteboard.whiteboardUploadedOfficeFiles,
  );
  const currentWhiteboardOfficeFileId = useAppSelector(
    (state) => state.whiteboard.currentWhiteboardOfficeFileId,
  );

  return whiteboardUploadedOfficeFiles.map((file) => {
    const isCurrentlyInUse = currentWhiteboardOfficeFileId === file.fileId;
    const isSelectedInModal = selectedFileId === file.fileId;

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
            <div className="right">{isCurrentlyInUse && <SelectedIcon />}</div>
          </div>
          <div className="progress-bar flex gap-2 items-center text-xs pt-0.5">
            {t('whiteboard.total-pages', {
              count: file.totalPages,
            })}
          </div>
        </div>
      </div>
    );
  });
};

export default UploadedFilesList;
