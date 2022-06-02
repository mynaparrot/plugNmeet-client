import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useJoinRoomMutation } from '../../../../store/services/breakoutRoomApi';
import { store } from '../../../../store';

interface IJoinBtnProps {
  breakoutRoomId: string;
}

const JoinBtn = ({ breakoutRoomId }: IJoinBtnProps) => {
  const { t } = useTranslation();
  const [disable, setDisable] = useState<boolean>(false);
  const [joinRoom, { isLoading, data }] = useJoinRoomMutation();

  useEffect(() => {
    setDisable(!!isLoading);
  }, [isLoading]);

  useEffect(() => {
    if (data) {
      if (!data.status) {
        toast(t(data.msg), {
          type: 'error',
        });
        return;
      }
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set('access_token', data.token ?? '');
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
  }, [data]);

  const join = () => {
    joinRoom({
      breakout_room_id: breakoutRoomId,
      user_id: store.getState().session.currentUser?.userId ?? '',
    });
  };

  return (
    <div className="">
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
