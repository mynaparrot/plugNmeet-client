import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { ShareScreenIconSVG } from '../../../assets/Icons/ShareScreenIconSVG';
import useScreenshare from './hooks/useScreenshare';

const ScreenshareIcon = () => {
  const { t } = useTranslation();
  const {
    isScreenShareAllowed,
    isMobileOrTablet,
    showTooltip,
    hybrid,
    nativeAvailable,
    isActiveShare,
    isLocked,
    toggleScreenShare,
  } = useScreenshare();

  const text = () => {
    if (hybrid && !nativeAvailable) {
      return t('footer.icons.native-publisher-unavailable');
    }
    if (isActiveShare) {
      return t('footer.icons.stop-screen-sharing');
    } else if (!isActiveShare && !isLocked) {
      return t('footer.icons.start-screen-sharing');
    } else if (isLocked) {
      return t('footer.icons.screen-sharing-locked');
    }
  };

  const wrapperClasses = clsx(
    'share-screen hidden md:block relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4',
    {
      'border-[rgba(124,206,247,0.25)] dark:border-Gray-800': isActiveShare,
      'border-transparent': !isActiveShare,
      '!border-Red-100 dark:!border-Red-600 cursor-not-allowed': isLocked,
    },
  );

  const innerDivClasses = clsx(
    'footer-icon-bg h-full relative w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 dark:border-Gray-700 shadow transition-all duration-300 hover:bg-gray-100 dark:hover:bg-Gray-700 text-Gray-950 dark:text-white',
    {
      'has-tooltip': showTooltip,
      'bg-gray-100 dark:bg-Gray-700': isActiveShare,
      'bg-white dark:bg-Gray-800': !isActiveShare,
      '!border-Red-200 dark:!border-Red-400 text-Red-400': isLocked,
      'cursor-not-allowed opacity-50': hybrid && !nativeAvailable && !isLocked,
    },
  );

  if (!isScreenShareAllowed) {
    return null;
  }

  if (isMobileOrTablet && !hybrid) {
    return null;
  }

  return (
    <button
      type="button"
      className={wrapperClasses}
      onClick={toggleScreenShare}
    >
      <div className={innerDivClasses}>
        <span className="tooltip">{text()}</span>
        <ShareScreenIconSVG classes="w-auto h-4 3xl:h-5" />
        {!isActiveShare && (
          <span className="add absolute -top-2 -right-2 z-10">
            {isLocked ? <i className="pnm-lock primaryColor" /> : null}
          </span>
        )}
      </div>
    </button>
  );
};

export default ScreenshareIcon;
