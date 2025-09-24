import React from 'react';

import { useAppSelector } from '../../../store';
import { FileIconSVG } from '../../../assets/Icons/FileIconSVG';
import { IWhiteboardOfficeFile } from '../../../store/slices/interfaces/whiteboard';

interface UploadedOfficeFiles {
  onSelectOfficeFile: (fileId: IWhiteboardOfficeFile) => void;
}

const UploadedOfficeFiles = ({ onSelectOfficeFile }: UploadedOfficeFiles) => {
  const whiteboardUploadedOfficeFiles = useAppSelector(
    (state) => state.whiteboard.whiteboardUploadedOfficeFiles,
  );
  const currentWhiteboardOfficeFileId = useAppSelector(
    (state) => state.whiteboard.currentWhiteboardOfficeFileId,
  );

  return whiteboardUploadedOfficeFiles.map((file) => {
    return (
      <div
        key={file.fileId}
        className="flex gap-4 py-2 px-3 bg-Gray-50 w-full rounded-xl"
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
              {currentWhiteboardOfficeFileId === file.fileId && (
                <>Selected icon</>
              )}
            </div>
          </div>
          <div className="progress-bar flex gap-2 items-center">
            Total pages: {file.totalPages}
          </div>
        </div>
      </div>
    );
  });
};

export default UploadedOfficeFiles;
