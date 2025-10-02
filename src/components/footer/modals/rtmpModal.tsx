import React, { useCallback, useEffect, useState } from 'react';
import { isEmpty, isURL } from 'validator';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  RecordingReqSchema,
  RecordingTasks,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateShowRtmpModal } from '../../../store/slices/bottomIconsActivitySlice';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';
import Dropdown from '../../../helpers/ui/dropdown';
import FormattedInputField from '../../../helpers/ui/formattedInputField';
import ConfirmationModal from '../../../helpers/ui/confirmationModal';
import ActionButton from '../../../helpers/ui/actionButton';
import Modal from '../../../helpers/ui/modal';

const RtmpModal = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isActiveRtmpBroadcasting = useAppSelector(
    (state) => state.session.isActiveRtmpBroadcasting,
  );
  const [provider, setProvider] = useState<string>('youtube');
  const [showServerUrl, setShowServerUrl] = useState<boolean>(false);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [serverKey, setServerKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const providers = {
    youtube: 'rtmp://a.rtmp.youtube.com/live2',
    facebook: 'rtmps://live-api-s.facebook.com:443/rtmp',
  };

  useEffect(() => {
    if (provider === 'other') {
      setShowServerUrl(true);
    } else {
      setShowServerUrl(false);
    }
  }, [provider]);

  const closeStartModal = () => {
    dispatch(updateShowRtmpModal(false));
  };

  const startBroadcasting = useCallback(
    async (e: React.FormEvent | React.MouseEvent) => {
      e.preventDefault();
      if (provider === 'other' && isEmpty(serverUrl)) {
        return;
      }
      if (isEmpty(serverKey)) {
        return;
      }
      let url: string;
      if (provider === 'other') {
        url = serverUrl;
      } else {
        url = providers[provider];
      }

      const isvalid = isURL(url, {
        protocols: ['rtmp', 'rtmps'],
      });

      if (!isvalid) {
        return;
      }

      setIsLoading(true);
      const body = create(RecordingReqSchema, {
        task: RecordingTasks.START_RTMP,
        sid: store.getState().session.currentRoom.sid,
        rtmpUrl: url + '/' + serverKey,
      });

      if (typeof (window as any).DESIGN_CUSTOMIZATION !== 'undefined') {
        body.customDesign = `${(window as any).DESIGN_CUSTOMIZATION}`.replace(
          /\s/g,
          '',
        );
      }

      const r = await sendAPIRequest(
        'rtmp',
        toBinary(RecordingReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
      let msg = 'footer.notice.rtmp-starting';

      if (!res.status) {
        msg = res.msg;
      }
      dispatch(
        addUserNotification({
          message: t(msg),
          typeOption: 'info',
        }),
      );

      dispatch(updateShowRtmpModal(false));
      setIsLoading(false);
    },
    // oxlint-disable-next-line exhaustive-deps
    [provider, serverUrl, serverKey, dispatch, t],
  );

  const renderStartBroadcastModal = () => {
    return (
      <Modal
        show={!isActiveRtmpBroadcasting}
        onClose={closeStartModal}
        title={t('footer.modal.rtmp-title')}
        renderButtons={() => (
          <ActionButton onClick={startBroadcasting} isLoading={isLoading}>
            {t('footer.modal.rtmp-start-broadcast')}
          </ActionButton>
        )}
      >
        <div className="flex flex-col gap-1 min-h-[150px]">
          <Dropdown
            label={t('footer.modal.rtmp-select-provider')}
            id="provider"
            value={provider}
            onChange={setProvider}
            options={[
              { value: 'youtube', text: 'YouTube' },
              { value: 'facebook', text: 'Facebook' },
              { value: 'other', text: 'Other' },
            ]}
            direction="horizontal"
          />
          {showServerUrl && (
            <FormattedInputField
              label={t('footer.modal.rtmp-server-url')}
              id="stream-url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.currentTarget.value)}
            />
          )}
          <FormattedInputField
            label={t('footer.modal.rtmp-stream-key')}
            id="stream-key"
            value={serverKey}
            onChange={(e) => setServerKey(e.currentTarget.value)}
          />
        </div>
      </Modal>
    );
  };

  const handleStopBroadcast = async () => {
    const body = create(RecordingReqSchema, {
      task: RecordingTasks.STOP_RTMP,
      sid: store.getState().session.currentRoom.sid,
    });

    const r = await sendAPIRequest(
      'rtmp',
      toBinary(RecordingReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
    let msg = t('footer.notice.rtmp-ending');

    if (!res.status) {
      msg = res.msg;
    }
    dispatch(
      addUserNotification({
        message: t(msg),
        typeOption: 'info',
      }),
    );
    dispatch(updateShowRtmpModal(false));
  };

  return !isActiveRtmpBroadcasting ? (
    renderStartBroadcastModal()
  ) : (
    <ConfirmationModal
      show={isActiveRtmpBroadcasting}
      onClose={() => dispatch(updateShowRtmpModal(false))}
      onConfirm={handleStopBroadcast}
      title={t('footer.modal.rtmp-close-confirm')}
      text={t('footer.modal.rtmp-close-msg')}
    />
  );
};

export default RtmpModal;
