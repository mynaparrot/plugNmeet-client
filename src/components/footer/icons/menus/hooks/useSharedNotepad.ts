import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChangeEtherpadStatusReqSchema,
  CreateEtherpadSessionResSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppDispatch, useAppSelector } from '../../../../../store';
import { updateIsActiveSharedNotePad } from '../../../../../store/slices/bottomIconsActivitySlice';
import { addUserNotification } from '../../../../../store/slices/roomSettingsSlice';
import sendAPIRequest from '../../../../../helpers/api/plugNmeetAPI';

const useSharedNotepad = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { roomFeatures, roomId } = useMemo(() => {
    const session = store.getState().session;
    return {
      roomFeatures: session.currentRoom.metadata?.roomFeatures,
      roomId: session.currentRoom.roomId,
    };
  }, []);
  const sharedNotepadStatus = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures
        ?.isActive,
  );

  const toggleSharedNotepad = useCallback(async () => {
    const makeApiRequest = async (
      endpoint: string,
      body: any,
      onSuccess: () => void,
    ) => {
      const r = await sendAPIRequest(
        endpoint,
        body,
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CreateEtherpadSessionResSchema, new Uint8Array(r));
      if (res.status) {
        onSuccess();
      } else if (res.msg) {
        dispatch(
          addUserNotification({
            message: t(res.msg),
            typeOption: 'error',
          }),
        );
      }
    };

    const host = roomFeatures?.sharedNotePadFeatures?.host;

    if (!host && !sharedNotepadStatus) {
      await makeApiRequest('etherpad/create', {}, () =>
        dispatch(updateIsActiveSharedNotePad(true)),
      );
    } else if (host) {
      const newStatus = !sharedNotepadStatus;
      const body = create(ChangeEtherpadStatusReqSchema, {
        roomId,
        isActive: newStatus,
      });
      await makeApiRequest(
        'etherpad/changeStatus',
        toBinary(ChangeEtherpadStatusReqSchema, body),
        () => dispatch(updateIsActiveSharedNotePad(newStatus)),
      );
    }
  }, [roomFeatures, sharedNotepadStatus, roomId, dispatch, t]);

  return { toggleSharedNotepad, sharedNotepadStatus };
};

export default useSharedNotepad;
