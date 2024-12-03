import React, { useState } from 'react';
import { isEmpty } from 'lodash';
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

const DirectLink = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const [playBackUrl, setPlayBackUrl] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>();

  const onChangeUrl = (e) => {
    if (errorMsg) {
      setErrorMsg(undefined);
    }
    setPlayBackUrl(e.currentTarget.value);
  };

  const startPlayer = async (e) => {
    e.preventDefault();

    if (isEmpty(playBackUrl)) {
      setErrorMsg(
        t('footer.notice.external-media-player-url-required').toString(),
      );
      return;
    }

    if (!ReactPlayer.canPlay(playBackUrl)) {
      setErrorMsg(
        t('footer.notice.external-media-player-url-invalid').toString(),
      );
      return;
    }

    setErrorMsg(undefined);
    dispatch(updateShowExternalMediaPlayerModal(false));

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

    toast.dismiss(id);
    dispatch(updateShowExternalMediaPlayerModal(false));
  };

  return (
    <form method="POST" onSubmit={(e) => startPlayer(e)}>
      <div className="s">
        <div className="">
          <div className="">
            <label
              htmlFor="stream-key"
              className="block text-sm font-medium text-Gray-800"
            >
              {t('footer.modal.external-media-player-url')}
            </label>
            <input
              type="text"
              name="stream-key"
              id="stream-key"
              value={playBackUrl}
              onChange={onChangeUrl}
              className="h-11 rounded-[15px] border border-Gray-300 bg-white shadow-input w-full px-3 mt-1 outline-none focus:border-[rgba(0,161,242,1)] focus:shadow-inputFocus"
            />
            {errorMsg ? (
              <div className="error-msg absolute text-xs text-red-600 py-2">
                {errorMsg}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          className="h-9 w-1/2 flex items-center justify-center rounded-xl text-sm font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-buttonShadow outline-none focus:border-[rgba(0,161,242,1)] focus:shadow-inputFocus"
        >
          {t('footer.modal.external-media-player-play')}
        </button>
      </div>
    </form>
  );
};

export default DirectLink;
