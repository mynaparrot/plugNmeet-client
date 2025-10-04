import React from 'react';
import { useTranslation } from 'react-i18next';

import DirectLink from './directLink';
import Upload from './upload';
import { useAppDispatch, useAppSelector } from '../../../../store';
import { updateShowExternalMediaPlayerModal } from '../../../../store/slices/bottomIconsActivitySlice';
import Modal from '../../../../helpers/ui/modal';
import Tabs from '../../../../helpers/ui/tabs';

const ExternalMediaPlayerModal = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const externalMediaPlayerIsActive = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures
        ?.externalMediaPlayerFeatures?.isActive,
  );

  const items = [
    {
      id: 1,
      title: t('footer.modal.external-media-player-direct-link'),
      content: <DirectLink />,
    },
    {
      id: 2,
      title: t('footer.modal.external-media-player-upload-file'),
      content: <Upload />,
    },
  ];

  const closeStartModal = () => {
    dispatch(updateShowExternalMediaPlayerModal(false));
  };

  return (
    !externalMediaPlayerIsActive && (
      <Modal
        show={!externalMediaPlayerIsActive}
        onClose={closeStartModal}
        title={t('footer.modal.external-media-player-title')}
        customClass="min-h-[20rem]"
      >
        <Tabs items={items} vertical />
      </Modal>
    )
  );
};

export default ExternalMediaPlayerModal;
