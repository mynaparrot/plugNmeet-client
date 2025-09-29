import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../store';
import { LoadingIcon } from '../../assets/Icons/Loading';

const DisplayExternalLink = () => {
  const { t } = useTranslation();
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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Reset loaded state when the link changes
    setLoaded(false);
  }, [link]);

  const onLoad = () => {
    setLoaded(true);
  };

  if (!isActive || !link) {
    return null;
  }

  return (
    <div className="external-display-link-wrapper m-auto h-[calc(100%-50px)] w-full max-w-[1100px] flex-1 sm:px-5 mt-9 p-2 relative">
      {!loaded && (
        <div className="loading-status absolute inset-0 z-10 flex h-full w-full items-center justify-center bg-white/50 dark:bg-black/50">
          <LoadingIcon
            className="inline h-10 w-10 animate-spin text-gray-200"
            fillColor="#004D90"
          />
        </div>
      )}
      <iframe
        height="100%"
        width="100%"
        src={link}
        onLoad={onLoad}
        title={t('external-display-link-display.iframe-title')}
        sandbox="allow-scripts allow-same-origin"
        allow="fullscreen"
        className={!loaded ? 'hidden' : 'block'}
      />
    </div>
  );
};

export default DisplayExternalLink;
