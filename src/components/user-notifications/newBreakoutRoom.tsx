import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { setActiveSidePanel } from '../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch, useAppSelector } from '../../store';
import ActionButton from '../../helpers/ui/actionButton';
import { BreakoutRoomIconSVG } from '../../assets/Icons/BreakoutRoomIconSVG';
import { AiIconSVG } from '../../assets/Icons/AiIconSVG';
import { useGetMyBreakoutRoomsQuery } from '../../store/services/breakoutRoomApi';
import { isAutoPerUserAISessionRoom } from '../../helpers/aiAgentSession';

interface NewBreakoutRoomProps {
  createdAt?: number;
  onClosePopover?: () => void;
}

const NewBreakoutRoom = ({ createdAt, onClosePopover }: NewBreakoutRoomProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const isAdmin = useAppSelector((state) => !!state.session.currentUser?.metadata?.isAdmin);
  const isBreakoutRoom = useAppSelector(
    (state) => !!state.session.currentRoom?.metadata?.isBreakoutRoom,
  );
  const metadata = useAppSelector((state) => state.session.currentRoom?.metadata);

  // invitations only matter to non-admins sitting in the main interface, except
  // in per-user AI rooms where the admin can own a 1-on-1 session room as well
  const { data: myRoomRes } = useGetMyBreakoutRoomsQuery(undefined, {
    skip: isBreakoutRoom || (isAdmin && !isAutoPerUserAISessionRoom(metadata)),
  });
  // per-user AI rooms are presented as 1-on-1 AI sessions, not breakout rooms
  const isAiSession = !!myRoomRes?.room?.enableAiAgent || isAutoPerUserAISessionRoom(metadata);

  const openBreakoutRoomsPanel = useCallback(() => {
    dispatch(setActiveSidePanel('BREAKOUT_ROOMS'));
    if (onClosePopover) {
      onClosePopover();
    }
  }, [dispatch, onClosePopover]);

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
        {isAiSession ? (
          <AiIconSVG classes="w-[15px]" />
        ) : (
          <BreakoutRoomIconSVG classes="w-[15px]" />
        )}
      </div>
      <div className="text flex-1 text-Gray-800 dark:text-white text-sm">
        <p>
          {isAiSession
            ? t('breakout-room.ai-session-invitation-msg')
            : t('breakout-room.invitation-msg')}
        </p>
        <div className="bottom flex justify-between text-Gray-800 dark:text-white text-xs items-center">
          <span className="">{formatDate(createdAt)}</span>{' '}
          <ActionButton
            onClick={openBreakoutRoomsPanel}
            custom="!h-5 w-auto px-2 !text-[10px] !rounded-md bg-Blue2-500 hover:bg-Blue2-600 border-Blue2-600"
          >
            {t('open')}
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default NewBreakoutRoom;
