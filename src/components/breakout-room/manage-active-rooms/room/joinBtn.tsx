import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from '@bufbuild/protobuf';
import { JoinBreakoutRoomReqSchema } from 'plugnmeet-protocol-js';

import { useJoinRoomMutation } from '../../../../store/services/breakoutRoomApi';
import { store } from '../../../../store';

interface IJoinBtnProps {
  breakoutRoomId: string;
  setErrorMsg: (msg: string) => void;
}

const JoinBtn = ({ breakoutRoomId, setErrorMsg }: IJoinBtnProps) => {
  const { t } = useTranslation();
  const [joinRoom, { isLoading, isSuccess, isError, data, error }] =
    useJoinRoomMutation();

  useEffect(() => {
    if (isSuccess && data?.status && data.token) {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set('access_token', data.token);
      const url =
        location.protocol +
        '//' +
        location.host +
        window.location.pathname +
        '?' +
        searchParams.toString();

      if (!window.open(url, '_blank')) {
        setErrorMsg(t('breakout-room.open-tab-error'));
      }
    } else if ((isSuccess && !data?.status) || isError) {
      const msg = data?.msg ?? (error as any)?.data?.msg ?? 'Error';
      setErrorMsg(t(msg));
    }
  }, [isSuccess, isError, data, error, t, setErrorMsg]);

  const handleJoin = useCallback(() => {
    // clear previous error
    setErrorMsg('');
    joinRoom(
      create(JoinBreakoutRoomReqSchema, {
        breakoutRoomId: breakoutRoomId,
        userId: store.getState().session.currentUser?.userId ?? '',
      }),
    );
  }, [joinRoom, breakoutRoomId, setErrorMsg]);

  return (
    <div className="join-btn mr-1">
      <button
        className="h-7 px-3 text-sm font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleJoin}
        disabled={isLoading}
      >
        {t('breakout-room.join')}
      </button>
    </div>
  );
};

export default JoinBtn;
