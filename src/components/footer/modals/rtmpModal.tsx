import React, { useCallback, useEffect, useState } from 'react';
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
import { getConfigValue } from '../../../helpers/utils';
import SettingsSwitch from '../../../helpers/ui/settingsSwitch';

type Provider = 'youtube' | 'facebook' | 'other' | 'whip';

const RtmpModal = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isActiveRtmpBroadcasting = useAppSelector(
    (state) => state.session.isActiveRtmpBroadcasting,
  );
  const externalBroadcastingFeatures = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.externalBroadcastingFeatures,
  );

  const [enableAutoCloseChatPanel, setEnableAutoCloseChatPanel] =
    useState<boolean>(
      !!externalBroadcastingFeatures?.recorderBotOptions
        ?.enableAutoCloseChatPanel,
    );
  const [durationAfterLastMessage, setDurationAfterLastMessage] =
    useState<number>(
      externalBroadcastingFeatures?.recorderBotOptions
        ?.durationAfterLastMessage ?? 300,
    );
  const [provider, setProvider] = useState<Provider>('youtube');
  const [showServerUrl, setShowServerUrl] = useState<boolean>(false);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [serverKey, setServerKey] = useState<string>('');
  const [displayError, setDisplayError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const providers = {
    youtube: 'rtmp://a.rtmp.youtube.com/live2',
    facebook: 'rtmps://live-api-s.facebook.com:443/rtmp',
  };

  useEffect(() => {
    if (provider === 'other' || provider === 'whip') {
      setShowServerUrl(true);
    } else {
      setShowServerUrl(false);
    }
  }, [provider]);

  const closeStartModal = () => {
    dispatch(updateShowRtmpModal(false));
  };

  const startBroadcasting = useCallback(
    async (e: React.SubmitEvent | React.MouseEvent) => {
      e.preventDefault();
      setDisplayError('');

      if (
        (provider === 'other' || provider === 'whip') &&
        serverUrl.trim() === ''
      ) {
        setDisplayError(t('footer.notice.external-media-player-url-required'));
        return;
      }
      if (provider !== 'whip' && serverKey.trim() === '') {
        setDisplayError(t('footer.notice.rtmp-stream-key-required'));
        return;
      }
      let url: string;
      if (provider === 'other' || provider === 'whip') {
        url = serverUrl;
      } else {
        url = providers[provider];
      }

      if (provider === 'whip') {
        const whipUrlRegex = /^https?:\/\//i;
        if (!whipUrlRegex.test(url)) {
          setDisplayError(t('footer.notice.whip-url-invalid'));
          return;
        }
      } else {
        const rtmpUrlRegex = /^rtmps?:\/\/[^\s/$.?#].\S*$/i;
        if (!rtmpUrlRegex.test(url)) {
          setDisplayError(t('footer.notice.rtmp-url-invalid'));
          return;
        }
      }

      setIsLoading(true);
      const body = create(RecordingReqSchema, {
        task: RecordingTasks.START_RTMP,
        sid: store.getState().session.currentRoom.sid,
        rtmpUrl:
          provider === 'whip'
            ? url
            : [url.replace(/\/$/, ''), serverKey].join('/'),
        recorderBotOptions: {
          enableAutoCloseChatPanel,
          durationAfterLastMessage,
        },
      });

      const customDesign = getConfigValue<string | undefined>(
        'designCustomization',
        undefined,
        'DESIGN_CUSTOMIZATION',
      );

      if (typeof customDesign !== 'undefined') {
        try {
          if (typeof customDesign === 'object') {
            body.customDesign = JSON.stringify(customDesign);
          } else {
            body.customDesign = customDesign.replace(/\s/g, '');
          }
        } catch (e) {
          console.error(e);
        }
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
        customClass="StartBroadcastModal"
      >
        <div className="flex flex-col min-h-[150px]">
          {displayError && (
            <div className="mb-2 rounded-lg bg-red-100 p-2 text-sm text-red-700 dark:bg-gray-800 dark:text-red-400">
              {displayError}
            </div>
          )}
          <Dropdown
            label={t('footer.modal.rtmp-select-provider')}
            id="provider"
            value={provider}
            onChange={setProvider}
            options={[
              { value: 'youtube', text: 'YouTube' },
              { value: 'facebook', text: 'Facebook' },
              { value: 'other', text: t('other') },
              { value: 'whip', text: t('footer.modal.rtmp-select-whip') },
            ]}
            direction="horizontal"
          />
          {showServerUrl && (
            <FormattedInputField
              label={
                provider === 'whip'
                  ? t('footer.modal.whip-server-url')
                  : t('footer.modal.rtmp-server-url')
              }
              id="stream-url"
              maxWidthClass="sm:max-w-[300px]"
              placeholder={
                provider === 'whip'
                  ? 'https://example.com/whip/?token=...'
                  : 'rtmp://your-server.com/live'
              }
              value={serverUrl}
              onChange={(e) => {
                setServerUrl(e.currentTarget.value);
                setDisplayError('');
              }}
            />
          )}
          {provider !== 'whip' && (
            <FormattedInputField
              label={t('footer.modal.rtmp-stream-key')}
              id="stream-key"
              maxWidthClass="sm:max-w-[300px]"
              placeholder="xxxx-xxxx-xxxx-xxxx"
              value={serverKey}
              onChange={(e) => {
                setServerKey(e.currentTarget.value);
                setDisplayError('');
              }}
            />
          )}
          <div className="mt-2 border-t border-Gray-100 dark:border-Gray-800 pt-4">
            <SettingsSwitch
              label={t('recorder-bot-options.enable-auto-close-chat-panel')}
              enabled={enableAutoCloseChatPanel}
              onChange={setEnableAutoCloseChatPanel}
              customCss="mb-5"
            />
            {enableAutoCloseChatPanel && (
              <FormattedInputField
                label={t('recorder-bot-options.duration-after-last-message')}
                id="duration"
                maxWidthClass="sm:max-w-[300px]"
                value={String(durationAfterLastMessage / 60)}
                onChange={(e) =>
                  setDurationAfterLastMessage(Number(e.target.value) * 60)
                }
                helpText={t(
                  'recorder-bot-options.duration-after-last-message-help',
                )}
                type="number"
              />
            )}
          </div>
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
