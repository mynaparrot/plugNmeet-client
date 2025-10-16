import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactPlayer from 'react-player/lazy';
import { isArray } from 'es-toolkit/compat';

import FormattedInputField from '../../../helpers/ui/formattedInputField';
import { PlusCircleIconSVG } from '../../../assets/Icons/PlusCircleIconSVG';
import { FileIconSVG } from '../../../assets/Icons/FileIconSVG';
import { TrashIconSVG } from '../../../assets/Icons/TrashIconSVG';
import {
  DB_STORE_USER_SETTINGS,
  idbGet,
  idbStore,
} from '../../../helpers/libs/idb';

interface DirectLinkProps {
  selectedUrl: string;
  setSelectedUrl: React.Dispatch<React.SetStateAction<string>>;
}
const EXTERNAL_MEDIA_PLAYER_PLAYBACK_URLS = 'externalMediaPlayerPlaybackUrls';

const DirectLink = ({ selectedUrl, setSelectedUrl }: DirectLinkProps) => {
  const { t } = useTranslation();
  const [playbackUrls, setPlaybackUrls] = useState<string[]>([]);

  const [playBackUrl, setPlayBackUrl] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | undefined>();

  useEffect(() => {
    idbGet<string[]>(
      DB_STORE_USER_SETTINGS,
      EXTERNAL_MEDIA_PLAYER_PLAYBACK_URLS,
    ).then((urls) => {
      if (urls && isArray(urls)) {
        setPlaybackUrls(urls);
      }
    });
  }, []);

  const addPlaybackUrl = useCallback(async () => {
    if (!playBackUrl) {
      setErrorMsg(t('footer.notice.external-media-player-url-required'));
      return;
    }
    if (!ReactPlayer.canPlay(playBackUrl)) {
      setErrorMsg(t('footer.notice.external-media-player-url-invalid'));
      return;
    }
    setErrorMsg(undefined);

    setPlaybackUrls((prevUrls) => {
      const newUrls = new Set([playBackUrl, ...prevUrls]);
      const arr = Array.from(newUrls);
      idbStore(
        DB_STORE_USER_SETTINGS,
        EXTERNAL_MEDIA_PLAYER_PLAYBACK_URLS,
        arr,
      ).then();
      return arr;
    });
    setPlayBackUrl('');
    setSelectedUrl(playBackUrl);
  }, [t, playBackUrl, setSelectedUrl]);

  const deletePlaybackUrl = useCallback(
    async (urlToDelete: string) => {
      const newUrls = playbackUrls.filter((url) => url !== urlToDelete);
      setPlaybackUrls(newUrls);
      await idbStore(
        DB_STORE_USER_SETTINGS,
        EXTERNAL_MEDIA_PLAYER_PLAYBACK_URLS,
        newUrls,
      );

      if (selectedUrl === urlToDelete) {
        setSelectedUrl('');
      }
    },
    [playbackUrls, selectedUrl, setSelectedUrl],
  );

  return (
    <>
      <div className="flex items-start gap-2 min-h-10">
        <div className="flex-auto">
          <FormattedInputField
            id="stream-key"
            placeholder={t('footer.modal.external-media-player-url')}
            value={playBackUrl}
            onChange={(e) => setPlayBackUrl(e.currentTarget.value)}
          />
        </div>
        <button
          className="h-10 w-10 3xl:h-11 3xl:w-11 bg-Gray-50 hover:bg-Gray-100 rounded-full flex justify-center items-center transition-all duration-300 shrink-0"
          type="button"
          onClick={addPlaybackUrl}
        >
          <PlusCircleIconSVG />
        </button>
      </div>
      {errorMsg && (
        <div className="error-msg text-xs text-red-600 py-1">{errorMsg}</div>
      )}
      {playbackUrls.length > 0 && (
        <div className="max-h-50 overflow-y-auto scrollBar grid gap-2 mt-8">
          {playbackUrls.map((url, i) => {
            let classNames =
              'flex items-center gap-4 py-2 px-3 w-full rounded-xl cursor-pointer transition-all duration-200';
            if (selectedUrl === url) {
              classNames += ' border-2 border-Blue2-500 bg-Blue2-50';
            } else {
              classNames += ' border border-Gray-100 bg-white hover:bg-Gray-50';
            }

            return (
              <div
                key={`url-${i}`}
                className={classNames}
                onClick={() => setSelectedUrl(url)}
              >
                <div className="icon w-9 h-9 rounded-full bg-Gray-100 text-Blue2-800 relative inline-flex items-center justify-center shrink-0">
                  <FileIconSVG />
                </div>
                <div className="text flex-1 text-Gray-800 text-sm overflow-hidden">
                  <p className="break-all truncate">{url}</p>
                </div>
                <button
                  className="delete-btn shrink-0 h-9 w-9 rounded-full hover:bg-red-100 text-red-600 flex items-center justify-center transition-all duration-200 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePlaybackUrl(url).then();
                  }}
                >
                  <TrashIconSVG />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default DirectLink;
