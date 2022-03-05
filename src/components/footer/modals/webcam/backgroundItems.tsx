import React, { useState } from 'react';
import {
  BackgroundConfig,
  backgroundImageUrls,
} from '../../../virtual-background/helpers/backgroundHelper';

interface IBackgroundItemsProps {
  onSelect: (bg: BackgroundConfig) => void;
}

const BackgroundItems = ({ onSelect }: IBackgroundItemsProps) => {
  const [selectedImg, setSelectedImg] = useState<string>();

  const handleOnClick = (type, url) => {
    setSelectedImg(url);
    onSelect({
      type,
      url,
    });
  };

  return (
    <div className="mt-2">
      <div className="cursor-pointer" onClick={() => handleOnClick('none', '')}>
        <i className="pnm-ban-solid" />
      </div>
      <div className="cursor-pointer" onClick={() => handleOnClick('blur', '')}>
        <i className="pnm-blur" />
      </div>
      {backgroundImageUrls.map((imageUrl) => {
        return (
          <div
            className="cursor-pointer"
            key={imageUrl}
            onClick={() => handleOnClick('image', imageUrl)}
          >
            <img
              src={imageUrl}
              alt={imageUrl}
              className={`object-fill h-20 w-30 ${
                selectedImg === imageUrl
                  ? 'border-4 rounded-sm border-black'
                  : ''
              }`}
            />
            ;
          </div>
        );
      })}
    </div>
  );
};

export default BackgroundItems;
