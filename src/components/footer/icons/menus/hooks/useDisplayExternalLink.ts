import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  CommonResponseSchema,
  ExternalDisplayLinkReqSchema,
  ExternalDisplayLinkTask,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { useAppDispatch, useAppSelector } from '../../../../../store';
import sendAPIRequest from '../../../../../helpers/api/plugNmeetAPI';
import { updateDisplayExternalLinkRoomModal } from '../../../../../store/slices/bottomIconsActivitySlice';
import { addUserNotification } from '../../../../../store/slices/roomSettingsSlice';

const useDisplayExternalLink = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isActiveDisplayExternalLink = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.displayExternalLinkFeatures?.isActive,
  );
  const isActiveExternalMediaPlayer = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.externalMediaPlayerFeatures?.isActive,
  );

  const toggleDisplayExternalLinkModal = useCallback(async () => {
    if (!isActiveDisplayExternalLink) {
      if (isActiveExternalMediaPlayer) {
        dispatch(
          addUserNotification({
            message: t('notifications.need-to-disable-external-media-player'),
            typeOption: 'error',
          }),
        );
      } else {
        dispatch(updateDisplayExternalLinkRoomModal(true));
      }
      return;
    }
    const body = create(ExternalDisplayLinkReqSchema, {
      task: ExternalDisplayLinkTask.STOP_EXTERNAL_LINK,
    });

    const id = toast.loading(t('please-wait'), {
      type: 'info',
    });

    const r = await sendAPIRequest(
      'externalDisplayLink',
      toBinary(ExternalDisplayLinkReqSchema, body),
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
  }, [isActiveDisplayExternalLink, isActiveExternalMediaPlayer, dispatch, t]);

  return { toggleDisplayExternalLinkModal, isActiveDisplayExternalLink };
};

export default useDisplayExternalLink;
