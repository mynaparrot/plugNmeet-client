import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from '@bufbuild/protobuf';
import { JoinBreakoutRoomReqSchema } from 'plugnmeet-protocol-js';

import { store, useAppDispatch } from '../../../store';
import { useJoinRoomMutation } from '../../../store/services/breakoutRoomApi';
import { updateReceivedInvitationFor } from '../../../store/slices/breakoutRoomSlice';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';
import ActionButton from '../../../helpers/ui/actionButton';
import { BreakoutRoomIconSVG } from '../../../assets/Icons/BreakoutRoomIconSVG';
import { buildAccessTokenUrl } from '../../../components/breakout-room/utils/breakoutRoom';

interface NewBreakoutRoomProps {
  receivedInvitationFor: string | undefined;
  createdAt: number | undefined;
}

const NewBreakoutRoom = ({
  receivedInvitationFor,
  createdAt,
}: NewBreakoutRoomProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [joinRoom, { isLoading, data }] = useJoinRoomMutation();
  const userId = useMemo(
    () => store.getState().session.currentUser?.userId,
    [],
  );

  useEffect(() => {
    if (!isLoading && data) {
      if (!data.status) {
        dispatch(
          addUserNotification({
            message: t(data.msg),
            typeOption: 'error',
            newInstance: true,
          }),
        );
        return;
      }
      if (data.token && data.token !== '') {
        // Redirect the current tab to the breakout room instead of opening a
        // new tab (window.location.replace keeps a single connection and makes
        // browser-back exit the session).
        window.location.replace(buildAccessTokenUrl(data.token));
        dispatch(updateReceivedInvitationFor(''));
      }
    }
    //eslint-disable-next-line
  }, [isLoading, data]);

  const join = useCallback(() => {
    if (!receivedInvitationFor) {
      dispatch(
        addUserNotification({
          message: t('breakout-room.user-joined'),
          typeOption: 'error',
          newInstance: true,
        }),
      );
      return;
    }
    joinRoom(
      create(JoinBreakoutRoomReqSchema, {
        breakoutRoomId: receivedInvitationFor,
        userId: userId,
      }),
    );
  }, [receivedInvitationFor, userId, joinRoom, dispatch, t]);

  const formatDate = (timeStamp?: number) => {
    const date = new Date(timeStamp ?? 0);
    return date.toLocaleString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="notification notif-breakoutRoom flex gap-4 py-2 px-4 border-b border-Gray-200 dark:border-Gray-800">
      <div className="icon w-9 h-9 rounded-full bg-Gray-100 text-Blue2-800 relative inline-flex items-center justify-center">
        <BreakoutRoomIconSVG classes="w-[15px]" />
      </div>
      <div className="text flex-1 text-Gray-800 dark:text-white text-sm">
        <p>{t('breakout-room.invitation-msg')}</p>
        <div className="bottom flex justify-between text-Gray-800 text-xs items-center">
          <span className="">{formatDate(createdAt)}</span>{' '}
          <div className="btn-group">
            <ActionButton
              onClick={join}
              isLoading={isLoading}
              custom="h-6 w-auto px-2 !text-xs !rounded-[8px] bg-Blue2-500 hover:bg-Blue2-600 border-Blue2-600"
            >
              {t('breakout-room.join')}
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewBreakoutRoom;
