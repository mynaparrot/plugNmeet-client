import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  MuteUnMuteTrackReqSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppDispatch } from '../../../../../store';
import sendAPIRequest from '../../../../../helpers/api/plugNmeetAPI';
import { addUserNotification } from '../../../../../store/slices/roomSettingsSlice';

const useMuteAll = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { sid, roomId } = useMemo(() => {
    const session = store.getState().session;
    return {
      sid: session.currentRoom.sid,
      roomId: session.currentRoom.roomId,
    };
  }, []);

  const muteAllUsers = useCallback(async () => {
    const body = create(MuteUnMuteTrackReqSchema, {
      sid: sid,
      roomId: roomId,
      userId: 'all',
      muted: true,
    });

    const r = await sendAPIRequest(
      'muteUnmuteTrack',
      toBinary(MuteUnMuteTrackReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (res.status) {
      dispatch(
        addUserNotification({
          message: t('footer.notice.muted-all-microphone'),
          typeOption: 'info',
        }),
      );
    } else {
      dispatch(
        addUserNotification({
          message: t(res.msg),
          typeOption: 'error',
        }),
      );
    }
  }, [sid, roomId, dispatch, t]);

  return { muteAllUsers };
};

export default useMuteAll;
