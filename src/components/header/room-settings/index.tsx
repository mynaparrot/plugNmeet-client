import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import sanitizeHtml from 'sanitize-html';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateShowRoomSettingsModal } from '../../../store/slices/roomSettingsSlice';
import Modal from '../../../helpers/ui/modal';
import Tabs from '../../../helpers/ui/tabs';
import ApplicationSettings from './application';
import DataSavings from './dataSavings';
import Ingress from './ingress';
import Notification from './notification';

declare const PNM_VERSION: string;

const RoomSettings = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { serverVersion, currentUser, copyright_conf, ingressFeatures } =
    useMemo(() => {
      const session = store.getState().session;
      return {
        serverVersion: session.serverVersion,
        currentUser: session.currentUser,
        copyright_conf: session.currentRoom.metadata?.copyrightConf,
        ingressFeatures:
          session.currentRoom.metadata?.roomFeatures?.ingressFeatures,
      };
    }, []);

  const isShowRoomSettingsModal = useAppSelector(
    (state) => state.roomSettings.isShowRoomSettingsModal,
  );

  const baseCategories = {
    'header.room-settings.application': <ApplicationSettings />,
    'header.room-settings.data-savings': <DataSavings />,
    'header.room-settings.notifications': <Notification />,
  };
  if (currentUser?.metadata?.isAdmin && ingressFeatures?.isAllow) {
    baseCategories['header.room-settings.ingress'] = <Ingress />;
  }
  const tabItems = Object.keys(baseCategories).map((k) => ({
    id: k,
    title: t(k),
    content: baseCategories[k],
  }));

  const closeModal = () => {
    dispatch(updateShowRoomSettingsModal(false));
  };

  if (!isShowRoomSettingsModal) {
    return null;
  }

  const renderModalFooter = () => {
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

  return (
    <Modal
      show={true}
      onClose={closeModal}
      title={t('header.room-settings.title')}
      maxWidth="max-w-2xl"
    >
      <div className="wrap relative">
        <Tabs items={tabItems} tabPanelsCss="min-h-[316px]" />
        {renderModalFooter()}
      </div>
    </Modal>
  );
};

export default RoomSettings;
