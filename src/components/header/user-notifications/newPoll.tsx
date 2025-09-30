import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { updateIsActivePollsPanel } from '../../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch } from '../../../store';
import { PollsIconSVG } from '../../../assets/Icons/PollsIconSVG';
import ActionButton from '../../../helpers/ui/actionButton';

interface INewPollProps {
  createdAt: number | undefined;
  onClosePopover?: () => void;
}

const NewPoll = ({ createdAt, onClosePopover }: INewPollProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const openPollsPanel = useCallback(() => {
    dispatch(updateIsActivePollsPanel(true));
    if (onClosePopover) {
      onClosePopover();
    }
  }, [dispatch, onClosePopover]);

  const formatDate = (timeStamp?: number) => {
    const date = new Date(timeStamp ?? 0);
    return date.toLocaleString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="notification notif-new-poll flex gap-4 py-2 px-4 border-b border-Gray-200">
      <div className="icon w-9 h-9 rounded-full bg-Gray-100 text-Blue2-800 relative inline-flex items-center justify-center">
        <PollsIconSVG classes="w-[15px]" />
      </div>
      <div className="text flex-1 text-Gray-800 text-sm">
        <p>{t('polls.new-poll')}</p>
        <div className="bottom flex justify-between text-Gray-800 text-xs items-center">
          <span className="">{formatDate(createdAt)}</span>{' '}
          <ActionButton
            onClick={openPollsPanel}
            custom="h-5 w-auto px-2 !text-[10px] !rounded-md bg-Blue2-500 hover:bg-Blue2-600 border-Blue2-600"
          >
            {t('open')}
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default NewPoll;
