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
      {t('polls.new-poll')}
      <div className="button-section flex items-center justify-end">
        <button
          className="h-7 px-6 leading-[28px] text-center transition ease-in bg-primaryColor hover:bg-secondaryColor text-white text-base font-semibold rounded-lg"
          onClick={openPoll}
        >
          {t('open')}
        </button>
      </div>
    </>
  );
};

export default NewPollMsg;
