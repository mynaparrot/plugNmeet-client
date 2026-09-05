import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from '@bufbuild/protobuf';
import { JoinBreakoutRoomReqSchema } from 'plugnmeet-protocol-js';

import { useJoinRoomMutation } from '../../../../store/services/breakoutRoomApi';
import { BreakoutRoomMessage } from '../..';
import { store } from '../../../../store';
import { buildAccessTokenUrl } from '../../utils/breakoutRoom';

interface IJoinBtnProps {
  breakoutRoomId: string;
  setMessage: (message: BreakoutRoomMessage | null) => void;
}

const JoinBtn = ({ breakoutRoomId, setMessage }: IJoinBtnProps) => {
  const { t } = useTranslation();
  const [joinRoom, { isLoading, isSuccess, isError, data, error }] =
    useJoinRoomMutation();

  useEffect(() => {
    if (isSuccess && data?.status && data.token) {
      // Redirect the current tab to the breakout room instead of opening a new
      // tab. The page unload naturally tears down the current connection.
      window.location.replace(buildAccessTokenUrl(data.token));
    } else if ((isSuccess && !data?.status) || isError) {
      const msg = data?.msg ?? (error as any)?.data?.msg ?? 'Error';
      setMessage({ text: t(msg), type: 'error' });
    }
  }, [isSuccess, isError, data, error, t, setMessage]);

  const handleJoin = useCallback(() => {
    // clear previous error
    setMessage(null);
    joinRoom(
      create(JoinBreakoutRoomReqSchema, {
        breakoutRoomId: breakoutRoomId,
        userId: store.getState().session.currentUser?.userId ?? '',
      }),
    );
  }, [joinRoom, breakoutRoomId, setMessage]);

  return (
    <div className="join-btn me-1">
      <button
        className="primary-button h-7 px-3 text-sm font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        onClick={handleJoin}
        disabled={isLoading}
      >
        {t('breakout-room.join')}
      </button>
    </div>
  );
};

export default JoinBtn;
