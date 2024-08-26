import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { create } from '@bufbuild/protobuf';
import { JoinBreakoutRoomReqSchema } from 'plugnmeet-protocol-js';

import { useJoinRoomMutation } from '../../../../store/services/breakoutRoomApi';
import { store } from '../../../../store';

interface IJoinBtnProps {
  breakoutRoomId: string;
}

const JoinBtn = ({ breakoutRoomId }: IJoinBtnProps) => {
  const { t } = useTranslation();
  const [disable, setDisable] = useState<boolean>(false);
  const [token, setToken] = useState<string>('');
  const [joinRoom, { isLoading, data }] = useJoinRoomMutation();

  useEffect(() => {
    setDisable(!!isLoading);
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading && data) {
      if (!data.status) {
        toast(t(data.msg), {
          type: 'error',
        });
        return;
      }

      setToken(data.token ?? '');
    }
    //eslint-disable-next-line
  }, [data, isLoading]);

  useEffect(() => {
    if (token !== '') {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set('access_token', token);
      const url =
        location.protocol +
        '//' +
        location.host +
        window.location.pathname +
        '?' +
        searchParams.toString();

      const opened = window.open(url, '_blank');
      if (!opened) {
        toast(t('breakout-room.open-tab-error'), {
          type: 'error',
        });
      }
    }
    //eslint-disable-next-line
  }, [token]);

  const join = () => {
    joinRoom(
      create(JoinBreakoutRoomReqSchema, {
        breakoutRoomId: breakoutRoomId,
        userId: store.getState().session.currentUser?.userId ?? '',
      }),
    );
  };

  return (
    <div className="join-btn mr-4">
      <button
        className="text-center py-1 px-3 mt-1 text-xs transition ease-in bg-primaryColor hover:bg-secondaryColor text-white font-semibold rounded-lg"
        onClick={join}
        disabled={disable}
      >
        {t('breakout-room.join')}
      </button>
    </div>
  );
};

export default JoinBtn;
