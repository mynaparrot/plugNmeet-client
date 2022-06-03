import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import {
  useGetMyBreakoutRoomsQuery,
  useJoinRoomMutation,
} from '../../../store/services/breakoutRoomApi';
import { store } from '../../../store';
import Duration from '../list/room/duration';

const MyBreakoutRooms = () => {
  const { t } = useTranslation();
  const { data: myRooms, isLoading: isLoadingMyRooms } =
    useGetMyBreakoutRoomsQuery();
  const [joinRoom, { isLoading, data }] = useJoinRoomMutation();
  const [token, setToken] = useState<string>('');

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
  }, [isLoading, data]);

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

      window.open(url, '_blank');
    }
    //eslint-disable-next-line
  }, [token]);

  const join = () => {
    joinRoom({
      breakout_room_id: myRooms?.room?.id ?? '',
      user_id: store.getState().session.currentUser?.userId ?? '',
      is_admin: false,
    });
  };

  const render = () => {
    if (!myRooms) {
      return null;
    }
    return (
      <div className="poll-item relative overflow-hidden border border-solid border-primaryColor/70 px-2 py-8 rounded-lg mb-4 transition ease-in hover:shadow-md">
        <div className="poll-title text-md text-primaryColor">
          {myRooms.room?.title}
        </div>
        <div className="total-vote rounded-bl-lg bg-secondaryColor absolute top-0 right-0 text-white text-[10px] py-1 px-3 uppercase">
          <strong>{t('polls.total')}: </strong> {myRooms.room?.users.length}
        </div>

        {myRooms.room?.started ? (
          <div className="status absolute top-0 left-0 text-[10px] text-white">
            <Duration
              duration={myRooms.room?.duration ?? 5}
              created={myRooms.room?.created ?? Date.now()}
            />
          </div>
        ) : (
          <div className="status absolute top-0 left-0 bg-secondaryColor text-[10px] text-white py-1 px-3 uppercase rounded-br-lg">
            {t('breakout-room.not-started')}
          </div>
        )}

        <div className="btn">
          <button
            onClick={join}
            className="absolute right-0 bottom-0 transition ease-in bg-primaryColor hover:bg-secondaryColor text-[10px] text-white pt-1 pb-[2px] px-3 uppercase rounded-tl-lg"
            disabled={!!isLoading}
          >
            {t('breakout-room.join')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`polls-list-wrapper relative overflow-auto scrollBar px-2 pt-2 xl:pt-3 h-full`}
    >
      <div className="polls-list-wrap-inner">
        {render()}
        {isLoadingMyRooms ? (
          <div className="loading absolute text-center top-1/2 -translate-y-1/2 z-[999] left-0 right-0 m-auto">
            <div className="lds-ripple">
              <div className="border-secondaryColor" />
              <div className="border-secondaryColor" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default MyBreakoutRooms;
