import React from 'react';

import { updateIsActivePollsPanel } from '../../../store/slices/bottomIconsActivitySlice';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../../store';

const NewPoll = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  return (
    <>
      <span className="text-black dark:text-darkText">
        {t('polls.new-poll')}
      </span>
      <div className="button-section flex items-center justify-start">
        <button
          className="text-center py-1 px-3 mt-1 text-xs transition ease-in bg-primaryColor hover:bg-secondaryColor text-white font-semibold rounded-lg"
          onClick={() => dispatch(updateIsActivePollsPanel(true))}
        >
          {t('open')}
        </button>
      </div>
    </>
  );
};

export default NewPoll;
