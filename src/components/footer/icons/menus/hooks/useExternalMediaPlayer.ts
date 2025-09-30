import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  CommonResponseSchema,
  ExternalMediaPlayerReqSchema,
  ExternalMediaPlayerTask,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { useAppDispatch, useAppSelector } from '../../../../../store';
import sendAPIRequest from '../../../../../helpers/api/plugNmeetAPI';
import { updateShowExternalMediaPlayerModal } from '../../../../../store/slices/bottomIconsActivitySlice';
import { addUserNotification } from '../../../../../store/slices/roomSettingsSlice';

const useExternalMediaPlayer = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isActiveExternalMediaPlayer = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.externalMediaPlayerFeatures?.isActive,
  );
  const isActiveDisplayExternalLink = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.displayExternalLinkFeatures?.isActive,
  );

  const toggleExternalMediaPlayer = useCallback(async () => {
    if (!isActiveExternalMediaPlayer) {
      if (isActiveDisplayExternalLink) {
        dispatch(
          addUserNotification({
            message: t('notifications.need-to-disable-display-external-link'),
            typeOption: 'error',
          }),
        );
      } else {
        dispatch(updateShowExternalMediaPlayerModal(true));
      }
      return;
    }

    const id = toast.loading(t('please-wait'), {
      type: 'info',
    });

    const body = create(ExternalMediaPlayerReqSchema, {
      task: ExternalMediaPlayerTask.END_PLAYBACK,
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
        autoClose: 3000,
      });
    } else {
      toast.dismiss(id);
    }
  }, [isActiveExternalMediaPlayer, isActiveDisplayExternalLink, dispatch, t]);

  return { toggleExternalMediaPlayer, isActiveExternalMediaPlayer };
};

export default useExternalMediaPlayer;
