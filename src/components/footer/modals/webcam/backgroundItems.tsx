import React, { useEffect, useState, useRef, ChangeEvent } from 'react';
// import { useTranslation } from 'react-i18next';

import {
  BackgroundConfig,
  backgroundImageUrls,
  defaultBackgroundConfig,
} from '../../../virtual-background/helpers/backgroundHelper';
import useResumableFilesUpload from '../../../../helpers/hooks/useResumableFilesUpload';

interface IBackgroundItemsProps {
  onSelect: (bg: BackgroundConfig) => void;
}

const BackgroundItems = ({ onSelect }: IBackgroundItemsProps) => {
  const allowedFileTypes = ['jpg', 'jpeg', 'png'];
  // const { t } = useTranslation();

  const [selectedBg, setSelectedBg] = useState<BackgroundConfig>(
    defaultBackgroundConfig,
  );
  const [bgImgs, setBgImgs] = useState<Array<string>>(backgroundImageUrls);
  const [files, setFiles] = useState<Array<File>>();
  const customFileRef = useRef<HTMLInputElement>(null);

  const { isUploading, result } = useResumableFilesUpload({
    allowedFileTypes,
    maxFileSize: '30',
    files,
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
    setSelectedBg(bg);
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
    <div className="grid grid-cols-6 gap-1 h-[164px] overflow-auto scrollBar mb-5">
      <div
        className={`wrap overflow-hidden rounded-2xl h-20 ${selectedBg.type === 'none' ? 'border-4 border-[rgba(124,206,247,0.25)]' : 'border-4 border-transparent'}`}
        onClick={() => handleOnClick('none', '')}
      >
        <div
          className={`cursor-pointer w-full h-full rounded-2xl flex items-center justify-center bg-Gray-50 overflow-hidden ${selectedBg.type === 'none' ? 'border border-Blue shadow-virtualItem' : ''}`}
        >
          <i className="pnm-ban-solid dark:text-darkSecondary2" />
        </div>
      </div>
      <div
        className={`wrap overflow-hidden rounded-2xl h-20 ${selectedBg.type === 'blur' ? 'border-4 border-[rgba(124,206,247,0.25)]' : 'border-4 border-transparent'}`}
        onClick={() => handleOnClick('blur', '')}
      >
        <div
          className={`cursor-pointer w-full h-full rounded-2xl flex items-center justify-center bg-Gray-50 overflow-hidden ${selectedBg.type === 'blur' ? 'border border-Blue' : ''}`}
        >
          <i className="pnm-blur dark:text-darkSecondary2" />
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
              className={`cursor-pointer w-full h-full rounded-2xl flex items-center justify-center bg-Gray-50 overflow-hidden ${selectedBg.url === imageUrl ? 'border border-Blue' : ''}`}
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
        <button className="cursor-pointer h-20 w-full border border-dashed border-Blue rounded-2xl flex items-center justify-center bg-Gray-50 overflow-hidden">
          {/* {t('footer.modal.upload-background-image')} */}
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
