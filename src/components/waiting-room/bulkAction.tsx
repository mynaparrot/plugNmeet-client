import React from 'react';
import { useTranslation } from 'react-i18next';

import { IParticipant } from '../../store/slices/interfaces/participant';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import { toast } from 'react-toastify';
import {
  ApproveWaitingUsersReqSchema,
  CommonResponseSchema,
  RemoveParticipantReqSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store } from '../../store';

interface IBulkActionProps {
  waitingParticipants: IParticipant[];
}

const BulkAction = ({ waitingParticipants }: IBulkActionProps) => {
  const { t } = useTranslation();

  const approveEveryone = () => {
    waitingParticipants.forEach(async (p) => {
      const body = create(ApproveWaitingUsersReqSchema, {
        userId: p.userId,
      });

      const r = await sendAPIRequest(
        'waitingRoom/approveUsers',
        toBinary(ApproveWaitingUsersReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

      if (!res.status) {
        toast(t(res.msg), {
          type: 'error',
        });
      }
    });
  };

  const rejectEveryone = () => {
    const session = store.getState().session;
    const body = create(RemoveParticipantReqSchema, {
      sid: session.currentRoom.sid,
      roomId: session.currentRoom.roomId,
    });
    waitingParticipants.forEach(async (p) => {
      body.userId = p.userId;
      body.msg = t('notifications.you-have-reject');
      body.blockUser = false;

      const r = await sendAPIRequest(
        'removeParticipant',
        toBinary(RemoveParticipantReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

      if (!res.status) {
        toast(t(res.msg), {
          type: 'error',
        });
      }
    });
  };

  return (
    <div className="my-4 grid grid-cols-2 gap-5">
      <button
        onClick={approveEveryone}
        className="h-9 w-full flex items-center justify-center rounded-xl text-sm font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-buttonShadow"
      >
        {t('waiting-room.accept-all')}
      </button>
      <button
        onClick={rejectEveryone}
        className="h-9 w-full flex items-center justify-center rounded-xl text-sm font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-buttonShadow"
      >
        {t('waiting-room.reject-all')}
      </button>
    </div>
  );
};

export default BulkAction;
