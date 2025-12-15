import React, { useCallback, useState } from 'react';
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
import { generateAvatarInitial } from '../../helpers/utils';
import { LoadingIcon } from '../../assets/Icons/Loading';

interface IWaitingParticipantItemProps {
  participant: IParticipant;
}

const WaitingParticipantItem = ({
  participant,
}: IWaitingParticipantItemProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = useCallback(async () => {
    setIsProcessing(true);
    const body = create(ApproveWaitingUsersReqSchema, {
      userId: participant.userId,
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
          message: t('left-panel.menus.notice.user-approved', {
            name: participant.name,
          }),
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
    // No need to set isProcessing(false) as the component will unmount on success.
  }, [dispatch, participant, t]);

  const handleReject = useCallback(
    async (block: boolean) => {
      setIsProcessing(true);
      const session = store.getState().session;
      const body = create(RemoveParticipantReqSchema, {
        sid: session.currentRoom.sid,
        roomId: session.currentRoom.roomId,
        userId: participant.userId,
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
    },
    [dispatch, participant, t],
  );

  const initials = generateAvatarInitial(participant.name);

  return (
    <div className="waiting-list-item mb-2 last:mb-0 pb-2 last:pb-0 border-b last:border-b-0 border-solid border-Gray-300 dark:border-Gray-800 w-full flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
      <div className="flex items-center gap-2 w-auto">
        <div className="thumb h-7 w-7 rounded-full bg-primary-color text-xs font-medium text-white flex items-center justify-center overflow-hidden shrink-0">
          {participant.metadata.profilePic ? (
            <img
              src={participant.metadata.profilePic}
              alt={participant.name}
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <p className="text-base text-Gray-950 dark:text-white capitalize font-medium">
          {participant.name}
        </p>
      </div>
      <div className="flex gap-1 w-auto items-center justify-end">
        {isProcessing ? (
          <div className="w-10 h-6 flex justify-center items-center">
            <LoadingIcon
              className="w-5 h-5 animate-spin"
              fillColor={'#004D90'}
            />
          </div>
        ) : (
          <>
            <button
              onClick={handleApprove}
              className="py-1 px-3 flex cursor-pointer items-center justify-center rounded-xl text-xs font-semibold text-white hover:text-Gray-950 bg-Blue hover:bg-white border border-[#0088CC] transition-all duration-300 shadow-button-shadow"
            >
              {t('left-panel.approve')}
            </button>
            <button
              onClick={() => handleReject(false)}
              className="py-1 px-3 flex cursor-pointer items-center justify-center rounded-xl text-xs font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-button-shadow"
            >
              {t('left-panel.reject')}
            </button>
            <button
              onClick={() => handleReject(true)}
              className="py-1 px-3 flex cursor-pointer items-center justify-center rounded-xl text-xs font-semibold text-white bg-Red-600 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-button-shadow"
            >
              {t('waiting-room.reject-and-block-user')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default WaitingParticipantItem;
