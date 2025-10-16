import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  CommonResponseSchema,
  ExternalMediaPlayerReqSchema,
  ExternalMediaPlayerTask,
} from 'plugnmeet-protocol-js';

import { useAppDispatch, useAppSelector } from '../../../store';
import { updateShowExternalMediaPlayerModal } from '../../../store/slices/bottomIconsActivitySlice';

import DirectLink from './directLink';
import Upload from './upload';
import Modal from '../../../helpers/ui/modal';
import Tabs from '../../../helpers/ui/tabs';
import ActionButton from '../../../helpers/ui/actionButton';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';

const ExternalMediaPlayerModal = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | undefined>();

  const externalMediaPlayerIsActive = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures
        ?.externalMediaPlayerFeatures?.isActive,
  );

  const handleStartPlayingUrl = async () => {
    setIsLoading(true);
    setErrorMsg(undefined);

    const body = create(ExternalMediaPlayerReqSchema, {
      task: ExternalMediaPlayerTask.START_PLAYBACK,
      url: selectedUrl,
    });
    const r = await sendAPIRequest(
      'externalMediaPlayer',
      toBinary(ExternalMediaPlayerReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (!res.status) {
      setErrorMsg(t(res.msg));
    }

    setIsLoading(false);
    dispatch(updateShowExternalMediaPlayerModal(false));
  };

  const items = [
    {
      id: 1,
      title: t('footer.modal.external-media-player-direct-link'),
      content: (
        <DirectLink setSelectedUrl={setSelectedUrl} selectedUrl={selectedUrl} />
      ),
    },
    {
      id: 2,
      title: t('footer.modal.external-media-player-upload-file'),
      content: (
        <Upload setSelectedUrl={setSelectedUrl} isPlayBtnLoading={isLoading} />
      ),
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
        customClass="min-h-[30rem]"
      >
        {errorMsg && (
          <div className="error-msg text-xs text-red-600 py-1">{errorMsg}</div>
        )}
        <Tabs items={items} vertical />
        <div className="mt-8 flex justify-end">
          <ActionButton
            isLoading={isLoading}
            buttonType="submit"
            disabled={selectedUrl === ''}
            onClick={handleStartPlayingUrl}
          >
            {t('footer.modal.external-media-player-play')}
          </ActionButton>
        </div>
      </Modal>
    )
  );
};

export default ExternalMediaPlayerModal;
