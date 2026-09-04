import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from '@bufbuild/protobuf';
import { toast } from 'react-toastify';
import { BackToMainRoomReqSchema } from 'plugnmeet-protocol-js';

import { store } from '../../store';
import { useBackToMainMutation } from '../../store/services/breakoutRoomApi';
import { buildAccessTokenUrl } from './utils/breakoutRoom';
import { ArrowLeft } from '../../assets/Icons/ArrowLeft';

const BackToMainBtn = () => {
  const { t } = useTranslation();
  const { isBreakoutRoom, roomId, userId, parentRoomId } = useMemo(() => {
    const session = store.getState().session;
    return {
      isBreakoutRoom: session.currentRoom.metadata?.isBreakoutRoom,
      roomId: session.currentRoom.roomId,
      userId: session.currentUser?.userId,
      parentRoomId: session.currentRoom.metadata?.parentRoomId,
    };
  }, []);

  const [backToMain, { isLoading, isSuccess, isError, data, error }] =
    useBackToMainMutation();

  useEffect(() => {
    if (isSuccess && data?.status && data.token) {
      window.location.replace(buildAccessTokenUrl(data.token));
    } else if ((isSuccess && !data?.status) || isError) {
      const msg = data?.msg ?? (error as any)?.data?.msg ?? 'Error';
      toast(t(msg), { type: 'error' });
    }
  }, [isSuccess, isError, data, error, t]);

  if (!isBreakoutRoom) {
    return null;
  }

  const handleClick = () => {
    backToMain(
      create(BackToMainRoomReqSchema, {
        roomId: roomId,
        userId: userId ?? '',
        parentRoomId: parentRoomId,
      }),
    );
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      aria-label={t('breakout-room.back-to-main-room').toString()}
      title={t('breakout-room.back-to-main-room').toString()}
      className="relative primary-button flex items-center gap-1 shrink-0 me-2 h-7 md:h-8 px-2 sm:px-3 text-xs sm:text-sm font-medium cursor-pointer bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ArrowLeft />
      <span className="hidden sm:inline whitespace-nowrap">
        {t('breakout-room.back-to-main-room')}
      </span>
    </button>
  );
};

export default React.memo(BackToMainBtn);
