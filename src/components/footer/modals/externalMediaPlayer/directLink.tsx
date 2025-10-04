import React, { useState } from 'react';
import { isEmpty } from 'es-toolkit/compat';
import ReactPlayer from 'react-player/lazy';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  ExternalMediaPlayerReqSchema,
  ExternalMediaPlayerTask,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import sendAPIRequest from '../../../../helpers/api/plugNmeetAPI';
import { updateShowExternalMediaPlayerModal } from '../../../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch } from '../../../../store';
import FormattedInputField from '../../../../helpers/ui/formattedInputField';
import ActionButton from '../../../../helpers/ui/actionButton';

// oxlint-disable-next-line no-unused-vars
interface DirectLinkProps {
  setPlayBackUrl: React.Dispatch<React.SetStateAction<string>>;
}

const DirectLink = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const [playBackUrl, setPlayBackUrl] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const onChangeUrl = (e) => {
    if (errorMsg) {
      setErrorMsg(undefined);
    }
    setPlayBackUrl(e.currentTarget.value);
  };

  const startPlayer = async (e) => {
    e.preventDefault();

    if (isEmpty(playBackUrl)) {
      setErrorMsg(t('footer.notice.external-media-player-url-required'));
      return;
    }

    if (!ReactPlayer.canPlay(playBackUrl)) {
      setErrorMsg(t('footer.notice.external-media-player-url-invalid'));
      return;
    }

    setErrorMsg(undefined);
    setIsLoading(true);

    const id = toast.loading(
      t('footer.notice.external-media-player-starting'),
      {
        type: 'info',
      },
    );

    const body = create(ExternalMediaPlayerReqSchema, {
      task: ExternalMediaPlayerTask.START_PLAYBACK,
      url: playBackUrl,
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
      toast.update(id, {
        render: t(res.msg),
        type: 'error',
        isLoading: false,
        autoClose: 1000,
      });
    }

    setIsLoading(false);
    toast.dismiss(id);
    dispatch(updateShowExternalMediaPlayerModal(false));
  };

  return (
    <form method="POST" onSubmit={(e) => startPlayer(e)}>
      <FormattedInputField
        id="stream-key"
        placeholder={t('footer.modal.external-media-player-url')}
        value={playBackUrl}
        onChange={onChangeUrl}
      />
      {errorMsg && (
        <div className="error-msg text-xs text-red-600 py-1">{errorMsg}</div>
      )}
      <div className="mt-8 flex justify-end">
        <ActionButton isLoading={isLoading} buttonType="submit">
          {t('footer.modal.external-media-player-play')}
        </ActionButton>
      </div>
    </form>
  );
};

export default DirectLink;
