import React from 'react';
import { FileIconSVG } from '../../../assets/Icons/FileIconSVG';
import { TrashIconSVG } from '../../../assets/Icons/TrashIconSVG';

interface ISavedLinkItemProps {
  url: string;
  selectedUrl: string;
  onSelect: (url: string) => void;
  onDelete: (url: string) => void;
}

const SavedLinkItem = ({
  url,
  selectedUrl,
  onSelect,
  onDelete,
}: ISavedLinkItemProps) => {
  let classNames =
    'flex items-center gap-4 py-2 px-3 w-full rounded-xl cursor-pointer transition-all duration-200';
  if (selectedUrl === url) {
    classNames += ' border-2 border-Blue2-500 bg-Blue2-50';
  } else {
    classNames += ' border border-Gray-100 bg-white hover:bg-Gray-50';
  }

  return (
    <div className={classNames}>
      <div
        className="flex flex-1 items-center gap-4 overflow-hidden"
        onClick={() => onSelect(url)}
      >
        <div className="icon w-9 h-9 rounded-full bg-Gray-100 text-Blue2-800 relative inline-flex items-center justify-center shrink-0">
          <FileIconSVG />
        </div>
        <div className="text flex-1 text-Gray-800 text-sm overflow-hidden">
          <p className="break-all truncate">{url}</p>
        </div>
      </div>
      <button
        className="delete-btn shrink-0 h-9 w-9 rounded-full hover:bg-red-100 text-red-600 flex items-center justify-center transition-all duration-200 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(url);
        }}
      >
        <TrashIconSVG />
      </button>
    </div>
  );
};

export default SavedLinkItem;
