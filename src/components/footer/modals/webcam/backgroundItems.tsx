import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { RoomUploadedFileType } from 'plugnmeet-protocol-js';

import {
  BackgroundConfig,
  backgroundImageUrls,
} from '../../../virtual-background/helpers/backgroundHelper';
import useResumableFilesUpload from '../../../../helpers/hooks/useResumableFilesUpload';
import { useAppSelector } from '../../../../store';

interface IBackgroundItemsProps {
  onSelect: (bg: BackgroundConfig) => void;
}

const BackgroundItems = ({ onSelect }: IBackgroundItemsProps) => {
  const allowedFileTypes = ['jpg', 'jpeg', 'png'];
  const selectedBg = useAppSelector(
    (state) => state.bottomIconsActivity.virtualBackground,
  );

  const [bgImgs, setBgImgs] = useState<Array<string>>(backgroundImageUrls);
  const [files, setFiles] = useState<Array<File>>();
  const customFileRef = useRef<HTMLInputElement>(null);

  const { isUploading, result } = useResumableFilesUpload({
    allowedFileTypes,
    maxFileSize: '30',
    files,
    fileType: RoomUploadedFileType.VIRTUAL_BACKGROUND,
  });

  useEffect(() => {
    if (result && result.filePath) {
      const path =
        (window as any).PLUG_N_MEET_SERVER_URL +
        '/download/uploadedFile/' +
        result.filePath;

      const newBgImgs = [...bgImgs];
      newBgImgs.push(path);
      setBgImgs([...newBgImgs]);

      const el = customFileRef.current;
      if (el) {
        el.value = '';
      }
    }
    //eslint-disable-next-line
  }, [result, customFileRef]);

  const handleOnClick = (type, url) => {
    const bg = {
      type,
      url,
    };
    onSelect(bg);
  };

  const customBgImage = (e: ChangeEvent<HTMLInputElement>) => {
    if (isUploading) {
      return;
    }
    const files = e.target.files;
    if (!files) {
      return;
    }
    setFiles([...files]);
  };

  return (
    <div className="grid grid-cols-6 gap-1 h-[175px] overflow-auto scrollBar mb-0 3xl:mb-5">
      <div
        className={`wrap overflow-hidden rounded-2xl h-20 ${selectedBg.type === 'none' ? 'border-4 border-[rgba(124,206,247,0.25)]' : 'border-4 border-transparent'}`}
        onClick={() => handleOnClick('none', '')}
      >
        <div
          className={`cursor-pointer w-full h-full flex items-center justify-center bg-Gray-50 overflow-hidden ${selectedBg.type === 'none' ? 'border border-Blue shadow-virtual-item rounded-xl' : 'rounded-2xl'}`}
        >
          <i className="pnm-ban-solid dark:text-dark-secondary2" />
        </div>
      </div>
      <div
        className={`wrap overflow-hidden rounded-2xl h-20 ${selectedBg.type === 'blur-sm' ? 'border-4 border-[rgba(124,206,247,0.25)]' : 'border-4 border-transparent'}`}
        onClick={() => handleOnClick('blur-sm', '')}
      >
        <div
          className={`cursor-pointer w-full h-full flex items-center justify-center bg-Gray-50 overflow-hidden ${selectedBg.type === 'blur-sm' ? 'border border-Blue shadow-virtual-item rounded-xl' : 'rounded-2xl'}`}
        >
          <i className="pnm-blur dark:text-dark-secondary2" />
        </div>
      </div>
      {bgImgs.map((imageUrl, i) => {
        return (
          <div
            className={`wrap overflow-hidden rounded-2xl h-20 transition-all duration-200 ${selectedBg.url === imageUrl ? 'border-4 border-[rgba(124,206,247,0.25)]' : 'border-4 border-transparent'}`}
            onClick={() => handleOnClick('image', imageUrl)}
            key={imageUrl}
          >
            <div
              className={`cursor-pointer w-full h-full flex items-center justify-center bg-Gray-50 overflow-hidden ${selectedBg.url === imageUrl ? 'border border-Blue shadow-virtual-item rounded-xl' : 'rounded-2xl'}`}
            >
              <img
                src={imageUrl}
                alt={`bg-${i + 1}`}
                className={`object-cover w-full h-full`}
              />
            </div>
          </div>
        );
      })}
      <div className="upload-btn-wrap relative border-4 border-transparent">
        <button className="cursor-pointer h-18 w-full border border-dashed border-Blue rounded-2xl flex items-center justify-center bg-Gray-50 overflow-hidden">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 1V15M1 8H15"
              stroke="#0088CC"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <input
          className="absolute left-0 top-0 opacity-0 w-full h-full cursor-pointer"
          ref={customFileRef}
          type="file"
          onChange={customBgImage}
          accept={allowedFileTypes.map((file) => '.' + file).join(',')}
        />
      </div>
    </div>
  );
};

export default BackgroundItems;
