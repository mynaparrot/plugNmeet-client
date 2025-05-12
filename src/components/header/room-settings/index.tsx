import React, { Fragment, useEffect, useState } from 'react';
import {
  Dialog,
  Button,
  DialogTitle,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import sanitizeHtml from 'sanitize-html';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateShowRoomSettingsModal } from '../../../store/slices/roomSettingsSlice';
import DataSavings from './dataSavings';
import Notification from './notification';
import ApplicationSettings from './application';
import Ingress from './ingress';
import { PopupCloseSVGIcon } from '../../../assets/Icons/PopupCloseSVGIcon';

declare const PNM_VERSION: string;

const RoomSettings = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const s = store.getState();
  const serverVersion = s.session.serverVersion;
  const copyright_conf = s.session.currentRoom?.metadata?.copyrightConf;
  const ingressFeatures =
    s.session.currentRoom?.metadata?.roomFeatures?.ingressFeatures;

  const isShowRoomSettingsModal = useAppSelector(
    (state) => state.roomSettings.isShowRoomSettingsModal,
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
    if (s.session?.currentUser?.metadata?.isAdmin && ingressFeatures?.isAllow) {
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

  const classNames = (...classes: string[]) => {
    return classes.filter(Boolean).join(' ');
  };

  const displayBottomText = () => {
    let text = '';
    if (
      copyright_conf &&
      copyright_conf.display &&
      copyright_conf.text !== ''
    ) {
      text = sanitizeHtml(copyright_conf.text, {
        allowedTags: ['b', 'i', 'em', 'strong', 'a'],
        allowedAttributes: {
          a: ['href', 'target'],
        },
      }).concat('&nbsp;');
    }

    text += t('plugnmeet-server-client-version', {
      server: serverVersion,
      client: PNM_VERSION,
    });
    return (
      <div
        className="absolute inset-x-0 -bottom-4 text-center text-Gray-950 text-xs"
        dangerouslySetInnerHTML={{ __html: text }}
      ></div>
    );
  };

  const showTabItems = () => {
    return (
      <div className="max-w-full">
        <TabGroup vertical>
          <TabList className="flex p-1 space-x-1 bg-Gray-200 rounded-xl">
            {Object.keys(categories).map((category) => (
              <Tab
                key={category}
                className={({ selected }) =>
                  classNames(
                    'w-full py-1 text-xs sm:text-sm leading-5 font-medium text-Gray-950 rounded-lg outline-none',
                    'ring-white ring-opacity-60',
                    selected
                      ? 'bg-white shadow text-Gray-950'
                      : 'hover:bg-white/40',
                  )
                }
              >
                {t(category as any)}
              </Tab>
            ))}
          </TabList>
          <TabPanels className="mt-2">
            {Object.values(categories).map((items, idx) => (
              <TabPanel
                key={idx}
                className="bg-transparent rounded-xl p-3 min-h-[316px] scrollBar overflow-auto"
              >
                {items.map((item) => (
                  <div key={item.id}>{item.elm}</div>
                ))}
              </TabPanel>
            ))}
          </TabPanels>
        </TabGroup>
      </div>
    );
  };

  const render = () => {
    return (
      <>
        <Transition appear show={isShowRoomSettingsModal} as={Fragment}>
          <Dialog
            as="div"
            className="SettingsPopup fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70"
            onClose={() => false}
          >
            <div className="flex min-h-full items-center justify-center p-4">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <div className="w-full max-w-2xl bg-white border border-Gray-200 shadow-virtualPOP p-6 rounded-xl overflow-hidden duration-300 ease-out">
                  <DialogTitle
                    as="h3"
                    className="flex items-center justify-between text-base 3xl:text-lg font-semibold leading-7 text-Gray-950 mb-2"
                  >
                    <span>{t('header.room-settings.title')}</span>
                    <Button onClick={() => closeModal()}>
                      <PopupCloseSVGIcon classes="text-Gray-600" />
                    </Button>
                  </DialogTitle>
                  <hr />
                  <div className="wrap relative mt-4">
                    {showTabItems()}
                    {displayBottomText()}
                  </div>
                </div>
              </TransitionChild>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  };

  return isShowRoomSettingsModal ? render() : null;
};

export default RoomSettings;
