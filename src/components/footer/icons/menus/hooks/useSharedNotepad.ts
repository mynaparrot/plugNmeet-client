import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChangeEtherpadStatusReqSchema,
  CommonResponseSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppDispatch, useAppSelector } from '../../../../../store';
import { updateIsActiveSharedNotePad } from '../../../../../store/slices/bottomIconsActivitySlice';
import { addUserNotification } from '../../../../../store/slices/roomSettingsSlice';
import sendAPIRequest from '../../../../../helpers/api/plugNmeetAPI';

const useSharedNotepad = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { roomId } = useMemo(() => {
    const session = store.getState().session;
    return {
      roomId: session.currentRoom.roomId,
    };
  }, []);

  const sharedNotepadStatus = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures
        ?.isActive,
  );

  const toggleSharedNotepad = useCallback(async () => {
    const newStatus = !sharedNotepadStatus;
    const body = create(ChangeEtherpadStatusReqSchema, {
      roomId,
      isActive: newStatus,
    });

    const r = await sendAPIRequest(
      'etherpad/changeStatus',
      toBinary(ChangeEtherpadStatusReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (res.status) {
      dispatch(updateIsActiveSharedNotePad(newStatus));
    } else if (res.msg) {
      dispatch(
        addUserNotification({ message: t(res.msg), typeOption: 'error' }),
      );
    }
  }, [sharedNotepadStatus, roomId, dispatch, t]);

  return { toggleSharedNotepad, sharedNotepadStatus };
};

export default useSharedNotepad;
