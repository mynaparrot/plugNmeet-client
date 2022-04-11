import React, { useState } from 'react';
import {
  BackgroundConfig,
  backgroundImageUrls,
  defaultBackgroundConfig,
} from '../../../virtual-background/helpers/backgroundHelper';

interface IBackgroundItemsProps {
  onSelect: (bg: BackgroundConfig) => void;
}

const BackgroundItems = ({ onSelect }: IBackgroundItemsProps) => {
  const [selectedBg, setSelectedBg] = useState<BackgroundConfig>(
    defaultBackgroundConfig,
  );

  const handleOnClick = (type, url) => {
    const bg = {
      type,
      url,
    };
    setSelectedBg(bg);
    onSelect(bg);
  };

  return (
    <div className="flex flex-wrap items-center justify-start p-3 bg-slate-100 shadow-header">
      <div
        className={`cursor-pointer rounded-md w-[62px] h-[62px] overflow-hidden flex items-center justify-center border-2 border-solid border-gray-300 transition transform scale-90 hover:scale-95 ease-in  ${
          selectedBg.type === 'none' ? 'border-secondaryColor scale-95' : ''
        }`}
        onClick={() => handleOnClick('none', '')}
      >
        <i className="pnm-ban-solid" />
      </div>
      <div
        className={`cursor-pointer rounded-md w-[62px] h-[62px] overflow-hidden flex items-center justify-center border-2 border-solid border-gray-300 transition transform scale-90 hover:scale-95 ease-in ${
          selectedBg.type === 'blur' ? 'border-secondaryColor scale-95' : ''
        }`}
        onClick={() => handleOnClick('blur', '')}
      >
        <i className="pnm-blur" />
      </div>
      {backgroundImageUrls.map((imageUrl) => {
        return (
          <div
            className={`cursor-pointer rounded-md w-[62px] h-[62px] overflow-hidden flex items-center justify-center transition transform scale-90 hover:scale-95 ease-in border-2 border-solid border-transparent ${
              selectedBg.url === imageUrl
                ? 'border-secondaryColor scale-95'
                : ''
            }`}
            key={imageUrl}
            onClick={() => handleOnClick('image', imageUrl)}
          >
            <img
              src={imageUrl}
              alt={imageUrl}
              className={`object-cover w-full h-full`}
            />
          </div>
        );
      })}
    </div>
  );
};

export default BackgroundItems;
