import React, { useState } from 'react';
import { isEmpty } from 'lodash';
import ReactPlayer from 'react-player/lazy';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import sendAPIRequest from '../../../../helpers/api/plugNmeetAPI';
import { updateShowExternalMediaPlayerModal } from '../../../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch } from '../../../../store';
import {
  CommonResponse,
  ExternalMediaPlayerReq,
  ExternalMediaPlayerTask,
} from '../../../../helpers/proto/plugnmeet_common_api_pb';

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

    const body = new ExternalMediaPlayerReq({
      task: ExternalMediaPlayerTask.START_PLAYBACK,
      url: playBackUrl,
    });
    const r = await sendAPIRequest(
      'externalMediaPlayer',
      body.toBinary(),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = CommonResponse.fromBinary(new Uint8Array(r));

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
              className="block text-sm font-medium text-gray-700 dark:text-darkText"
            >
              {t('footer.modal.external-media-player-url')}
            </label>
            <input
              type="text"
              name="stream-key"
              id="stream-key"
              value={playBackUrl}
              onChange={onChangeUrl}
              className="mt-1 px-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm rounded-md h-10 border border-solid border-black/50 dark:border-darkText bg-transparent dark:text-darkText autofill:bg-transparent"
            />
            {errorMsg ? (
              <div className="error-msg absolute text-xs text-red-600 py-2">
                {errorMsg}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="pb-3 pt-4 bg-gray-50 dark:bg-transparent text-right mt-4">
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primaryColor hover:bg-secondaryColor focus:outline-none focus:ring-2 focus:ring-offset-2 focus:bg-secondaryColor"
        >
          {t('footer.modal.external-media-player-play')}
        </button>
      </div>
    </form>
  );
};

export default DirectLink;
