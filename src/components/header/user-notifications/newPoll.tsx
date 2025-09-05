import React from 'react';

import { updateIsActivePollsPanel } from '../../../store/slices/bottomIconsActivitySlice';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../../store';
import { PollsIconSVG } from '../../../assets/Icons/PollsIconSVG';

const NewPoll = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  return (
    <>
      <div className="notification notif-new-poll flex gap-4 py-2 px-4 border-b border-Gray-200">
        <div className="icon w-9 h-9 rounded-full bg-Gray-100 text-Blue2-800 relative inline-flex items-center justify-center">
          <PollsIconSVG classes="w-[15px]" />
        </div>
        <div className="text flex-1 text-Gray-800 text-sm">
          <p>
            {/* Poll created:{' '}
            <strong>“How was today’s class?”</strong> */}
            {t('polls.new-poll')}
          </p>
          <div className="bottom flex justify-between text-Gray-800 text-xs items-center">
            <span className="">12:04 AM</span>{' '}
            <button
              onClick={() => dispatch(updateIsActivePollsPanel(true))}
              className="h-6 cursor-pointer px-2 flex items-center gap-1 text-xs font-semibold bg-Blue2-500 hover:bg-Blue2-600 border border-Blue2-600 rounded-[8px] text-white transition-all duration-300 shadow-button-shadow"
            >
              {t('open')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NewPoll;
