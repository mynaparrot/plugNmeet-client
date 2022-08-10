import React from 'react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch } from '../../store';
import { updateIsActiveParticipantsPanel } from '../../store/slices/bottomIconsActivitySlice';
import { updateSelectedTabLeftPanel } from '../../store/slices/roomSettingsSlice';

interface INewPollMsgProps {
  closeToast?(): void;
}

const NewPollMsg = ({ closeToast }: INewPollMsgProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const openPoll = () => {
    dispatch(updateIsActiveParticipantsPanel(true));
    dispatch(updateSelectedTabLeftPanel(1));
    if (closeToast) {
      closeToast();
    }
  };
  return (
    <>
      <span className="text-black dark:text-darkText">
        {t('polls.new-poll')}
      </span>
      <div className="button-section flex items-center justify-start">
        <button
          className="text-center py-1 px-3 mt-1 text-xs transition ease-in bg-primaryColor hover:bg-secondaryColor text-white font-semibold rounded-lg"
          onClick={openPoll}
        >
          {t('open')}
        </button>
      </div>
    </>
  );
};

export default NewPollMsg;
