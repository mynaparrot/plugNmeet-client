import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ApproveWaitingUsersReqSchema,
  CommonResponseSchema,
  RemoveParticipantReqSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { IParticipant } from '../../store/slices/interfaces/participant';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import { store, useAppDispatch } from '../../store';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';

interface IParticipantsListProps {
  waitingParticipants: IParticipant[];
}

const ParticipantsList = ({ waitingParticipants }: IParticipantsListProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const acceptUser = async (userId: string, name: string) => {
    const body = create(ApproveWaitingUsersReqSchema, {
      userId: userId,
    });

    const r = await sendAPIRequest(
      'waitingRoom/approveUsers',
      toBinary(ApproveWaitingUsersReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (res.status) {
      dispatch(
        addUserNotification({
          message: t('left-panel.menus.notice.user-approved', { name: name }),
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
  };

  const rejectUser = async (userId: string, block: boolean) => {
    const session = store.getState().session;
    const body = create(RemoveParticipantReqSchema, {
      sid: session.currentRoom.sid,
      roomId: session.currentRoom.roomId,
      userId: userId,
      msg: t('notifications.you-have-reject').toString(),
      blockUser: block,
    });

    const r = await sendAPIRequest(
      'removeParticipant',
      toBinary(RemoveParticipantReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (res.status) {
      dispatch(
        addUserNotification({
          message: t('left-panel.menus.notice.participant-removed'),
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
  };

  const renderWaitingParticipants = useCallback(() => {
    return waitingParticipants.map((p) => {
      return (
        <div
          className="waiting-list-item mb-2 last:mb-0 pb-2 last:pb-0 border-b last:border-b-0 border-solid border-Gray-300 w-full flex flex-wrap items-center justify-between"
          key={p.userId}
        >
          <p className="text-base text-Gray-950 capitalize font-medium">
            {p.name}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => acceptUser(p.userId, p.name)}
              className="py-1 px-3 flex items-center justify-center rounded-xl text-xs font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-button-shadow"
            >
              {t('left-panel.approve')}
            </button>
            <button
              onClick={() => rejectUser(p.userId, false)}
              className="py-1 px-3 flex items-center justify-center rounded-xl text-xs font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-button-shadow"
            >
              {t('left-panel.reject')}
            </button>
            <button
              onClick={() => rejectUser(p.userId, true)}
              className="py-1 px-3 flex items-center justify-center rounded-xl text-xs font-semibold text-white bg-Red-600 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-button-shadow"
            >
              {t('waiting-room.reject-and-block-user')}
            </button>
          </div>
        </div>
      );
    });
    //eslint-disable-next-line
  }, [waitingParticipants]);

  return (
    <div className="waiting-list-wrap">
      <p className="text-lg my-4 text-Gray-950 font-medium ltr:text-left rtl:text-right">
        {t('waiting-room.list-waiting-participants', {
          count: waitingParticipants.length,
        })}
      </p>
      <div className="waiting-list scrollBar h-[122px] overflow-auto">
        <div className="waiting-list-inner pb-0.5 pr-0.5">
          {renderWaitingParticipants()}
        </div>
      </div>
    </div>
  );
};

export default ParticipantsList;
