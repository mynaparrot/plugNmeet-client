import React, { useState } from 'react';

import { useAppSelector } from '../../store';

const DisplayExternalLink = () => {
  const link = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.displayExternalLinkFeatures?.link,
  );
  const isActive = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.displayExternalLinkFeatures?.isActive,
  );
  const [loaded, setLoaded] = useState<boolean>();

  const onLoad = () => {
    setLoaded(true);
  };

  const render = () => {
    if (!link || link === '') {
      return null;
    }
    return (
      <div className="external-display-link-wrapper m-auto h-[calc(100%-50px)] w-full max-w-[1100px] flex-1 sm:px-5 mt-9 p-2">
        {!loaded ? (
          <div className="loading absolute left-[50%] top-[40%] flex justify-center">
            <div className="lds-ripple">
              <div className="border-secondaryColor"></div>
              <div className="border-secondaryColor"></div>
            </div>
          </div>
        ) : null}
        <iframe height="100%" width="100%" src={link} onLoad={onLoad} />
      </div>
    );
  };

  return <>{isActive ? render() : null}</>;
};

export default DisplayExternalLink;
