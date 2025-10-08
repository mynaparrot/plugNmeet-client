import React, { useEffect, useState } from 'react';
import { Popover } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { store } from '../../../../store';
import { ChatHistoryIconSVG } from '../../../../assets/Icons/ChatHistoryIconSVG';

import SubtitleHistoryPanel from './subtitleHistoryPanel';

interface SubtitleTextsHistoryProps {
  isOpenPopover: (open: boolean) => void;
}

const SubtitleTextsHistory = ({ isOpenPopover }: SubtitleTextsHistoryProps) => {
  const { t } = useTranslation();
  const [showPopover, setShowPopover] = useState<boolean>(false);

  useEffect(() => {
    const isRecorder = store.getState().session.currentUser?.isRecorder;
    if (!isRecorder) {
      setShowPopover(true);
    }
  }, []);

  useEffect(() => {
    isOpenPopover(showPopover);
    //eslint-disable-next-line
  }, [showPopover]);

  return (
    <Popover className="subtitleTextsHistory relative">
      <button
        className="absolute left-5 bottom-14"
        onClick={() => setShowPopover(!showPopover)}
      >
        <div className="chat-history-icon relative h-11 w-11 rounded-full bg-Gray-950/70 cursor-pointer has-tooltip border-4 border-white/5 shadow-virtual-item flex items-center justify-center">
          {!showPopover && (
            <span className="tooltip">
              {t('speech-services.subtitle-history-modal-title')}
            </span>
          )}
          <ChatHistoryIconSVG />
        </div>
      </button>
      {showPopover && (
        <SubtitleHistoryPanel
          setShowPopover={setShowPopover}
          showPopover={showPopover}
        />
      )}
    </Popover>
  );
};

export default SubtitleTextsHistory;
