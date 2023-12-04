import React, { Fragment, useEffect, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { Transition, Dialog, Tab } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import {
  RootState,
  store,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
import { updateShowRoomSettingsModal } from '../../../store/slices/roomSettingsSlice';
import DataSavings from './dataSavings';
import Notification from './notification';
import ApplicationSettings from './application';
import Ingress from './ingress';

declare const PNM_VERSION: string;

const isShowRoomSettingsModalSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.isShowRoomSettingsModal,
);

const RoomSettings = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const s = store.getState();
  const serverVersion = s.session.serverVersion;
  const copyright_conf = s.session.currentRoom?.metadata?.copyright_conf;
  const ingressFeatures =
    s.session.currentRoom?.metadata?.room_features.ingress_features;

  const isShowRoomSettingsModal = useAppSelector(
    isShowRoomSettingsModalSelector,
  );

  const [categories, setCategories] = useState({
    'header.room-settings.application': [
      {
        id: 1,
        elm: <ApplicationSettings />,
      },
    ],
    'header.room-settings.data-savings': [
      {
        id: 2,
        elm: <DataSavings />,
      },
    ],
    'header.room-settings.notifications': [
      {
        id: 3,
        elm: <Notification />,
      },
    ],
  });

  useEffect(() => {
    if (
      s.session?.currentUser?.metadata?.is_admin &&
      ingressFeatures?.is_allow
    ) {
      categories['header.room-settings.ingress'] = [
        {
          id: 4,
          elm: <Ingress />,
        },
      ];
    }

    setCategories(categories);
    //eslint-disable-next-line
  }, []);

  const closeModal = () => {
    dispatch(updateShowRoomSettingsModal(false));
  };

  const classNames = (...classes) => {
    return classes.filter(Boolean).join(' ');
  };

  const displayBottomText = () => {
    let text = copyright_conf?.display ? `${copyright_conf?.text}&nbsp;` : '';
    text += t('plugnmeet-server-client-version', {
      server: serverVersion,
      client: PNM_VERSION,
    });
    return (
      <div
        className="absolute inset-x-0 bottom-0 text-center text-xs dark:text-darkText"
        dangerouslySetInnerHTML={{ __html: text }}
      ></div>
    );
  };

  const showTabItems = () => {
    return (
      <div className="max-w-full">
        <Tab.Group vertical>
          <Tab.List className="flex p-1 space-x-1 bg-primaryColor rounded-xl">
            {Object.keys(categories).map((category) => (
              <Tab
                key={category}
                className={({ selected }) =>
                  classNames(
                    'w-full py-1 text-xs sm:text-sm leading-5 font-medium text-secondaryColor rounded-lg outline-none',
                    'ring-white ring-opacity-60',
                    selected
                      ? 'bg-white dark:bg-secondaryColor shadow text-primaryColor dark:text-white'
                      : 'hover:bg-white/[0.12] hover:text-white',
                  )
                }
              >
                {t(category as any)}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels className="mt-2">
            {Object.values(categories).map((posts, idx) => (
              <Tab.Panel key={idx} className="bg-transparent rounded-xl p-3">
                <ul>
                  {posts.map((post) => (
                    <li key={post.id}>{post.elm}</li>
                  ))}
                </ul>
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>
    );
  };

  const render = () => {
    return (
      <>
        <Transition appear show={isShowRoomSettingsModal} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-[9999] overflow-y-auto"
            onClose={() => false}
          >
            <div className="min-h-screen px-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
              </Transition.Child>

              <span
                className="inline-block h-screen align-middle"
                aria-hidden="true"
              >
                &#8203;
              </span>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <div className="inline-block w-full h-[25rem] max-w-2xl py-6 px-4 lg:px-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-darkPrimary shadow-xl rounded-2xl">
                  <button
                    className="close-btn absolute top-8 ltr:right-6 rtl:left-6 w-[25px] h-[25px] outline-none"
                    type="button"
                    onClick={() => closeModal()}
                  >
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
                  </button>

                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-2 ltr:text-left rtl:text-right"
                  >
                    {t('header.room-settings.title')}
                  </Dialog.Title>
                  <hr />
                  <div className="mt-2">{showTabItems()}</div>
                  {displayBottomText()}
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  };

  return <>{isShowRoomSettingsModal ? render() : null}</>;
};

export default RoomSettings;
