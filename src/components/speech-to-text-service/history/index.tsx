import React, { useState, useEffect } from 'react';
import { Popover } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import PopoverPanelElms from './popoverPanelElms';

interface SubtitleTextsHistoryProps {
  isOpenPopover: (open: boolean) => void;
}

const SubtitleTextsHistory = ({ isOpenPopover }: SubtitleTextsHistoryProps) => {
  const { t } = useTranslation();
  const [showPopover, setShowPopover] = useState<boolean>(true);

  useEffect(() => {
    isOpenPopover(showPopover);
    //eslint-disable-next-line
  }, [showPopover]);

  return (
    <Popover className="subtitleTextsHistory relative">
      <button
        className="absolute left-[2.7rem] lg:left-[3.1rem] bottom-1"
        onClick={() => setShowPopover(!showPopover)}
      >
        <div className="microphone footer-icon relative h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] rounded-full bg-[#F2F2F2] dark:bg-darkSecondary2 hover:bg-[#ECF4FF] flex items-center justify-center cursor-pointer has-tooltip">
          <span className="tooltip">
            {t('speech-services.subtitle-history-modal-title')}
          </span>
          <i className="pnm-timeline-solid primaryColor dark:text-darkText text-[12px] lg:text-[14px]"></i>
        </div>
      </button>
      {showPopover ? (
        <PopoverPanelElms
          setShowPopover={setShowPopover}
          showPopover={showPopover}
        />
      ) : null}
    </Popover>
  );
};

export default SubtitleTextsHistory;
