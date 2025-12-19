import React from 'react';
import { useTranslation } from 'react-i18next';

import Create from './create/index';
import PollsList from './pollsList';

import { store, useAppDispatch } from '../../store';
import { CloseIconSVG } from '../../assets/Icons/CloseIconSVG';
import { setActiveSidePanel } from '../../store/slices/bottomIconsActivitySlice';

const PollsComponent = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;

  return (
    <div className="side-panel-bg-color relative z-10 w-full bg-Gray-25 dark:bg-dark-primary border-l border-Gray-200 dark:border-Gray-800 h-full">
      <div
        className="inline-block absolute z-50 right-3 3xl:right-5 top-[10px] 3xl:top-[18px] text-Gray-600 dark:text-white cursor-pointer"
        onClick={() => dispatch(setActiveSidePanel(null))}
      >
        <CloseIconSVG />
      </div>
      <div className="inner-wrapper relative z-20 w-full">
        <div className="top flex items-center h-10 3xl:h-14 px-3 3xl:px-5 border-b border-Gray-200 dark:border-Gray-800">
          <p className="text-sm 3xl:text-base text-Gray-950 dark:text-white font-medium leading-tight">
            {t('polls.title')}
          </p>
        </div>
        <PollsList />
        {isAdmin && <Create />}
      </div>
    </div>
  );
};

export default PollsComponent;
