import React, { useEffect, useState, useRef, ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import {
  BackgroundConfig,
  backgroundImageUrls,
  defaultBackgroundConfig,
} from '../../../virtual-background/helpers/backgroundHelper';
import useResumableFilesUpload from '../../../../helpers/hooks/useResumableFilesUpload';
import useBodyPix from '../../../virtual-background/hooks/useBodyPix';

interface IBackgroundItemsProps {
  onSelect: (bg: BackgroundConfig) => void;
}

const BackgroundItems = ({ onSelect }: IBackgroundItemsProps) => {
  // we'll require making ready virtual background
  // elements as early as possible.
  useBodyPix();

  const allowedFileTypes = ['jpg', 'jpeg', 'png'];
  const { t } = useTranslation();

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
    <div className="flex flex-wrap items-center justify-start p-3 bg-slate-100 dark:bg-transparent shadow-header">
      <div
        className={`cursor-pointer rounded-md w-[62px] h-[62px] overflow-hidden flex items-center justify-center border-2 border-solid border-gray-300 dark:border-primaryColor transition transform scale-90 hover:scale-95 ease-in  ${
          selectedBg.type === 'none'
            ? 'border-[#24aef7] dark:border-[#24aef7] scale-95'
            : ''
        }`}
        onClick={() => handleOnClick('none', '')}
      >
        <i className="pnm-ban-solid dark:text-darkSecondary2" />
      </div>
      <div
        className={`cursor-pointer rounded-md w-[62px] h-[62px] overflow-hidden flex items-center justify-center border-2 border-solid border-gray-300 dark:border-primaryColor transition transform scale-90 hover:scale-95 ease-in ${
          selectedBg.type === 'blur'
            ? 'border-[#24aef7] dark:border-[#24aef7] scale-95'
            : ''
        }`}
        onClick={() => handleOnClick('blur', '')}
      >
        <i className="pnm-blur dark:text-darkSecondary2" />
      </div>
      {bgImgs.map((imageUrl, i) => {
        return (
          <div
            className={`cursor-pointer rounded-md w-[62px] h-[62px] overflow-hidden flex items-center justify-center transition transform scale-90 hover:scale-95 ease-in border-2 border-solid border-transparent ${
              selectedBg.url === imageUrl ? 'border-[#24aef7] scale-95' : ''
            }`}
            key={imageUrl}
            onClick={() => handleOnClick('image', imageUrl)}
          >
            <img
              src={imageUrl}
              alt={`bg-${i + 1}`}
              className={`object-cover w-full h-full`}
            />
          </div>
        );
      })}
      <div className="upload-btn-wrap relative overflow-hidden inline-block cursor-pointer pt-2 w-full">
        <button className="btn border border-dotted border-[#24aef7] bg-transparent py-2 px-4 rounded text-xs text-secondaryColor cursor-pointer">
          {t('footer.modal.upload-background-image')}
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
