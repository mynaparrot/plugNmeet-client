import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { JoinBreakoutRoomReqSchema } from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import {
  useGetMyBreakoutRoomsQuery,
  useJoinRoomMutation,
} from '../../../store/services/breakoutRoomApi';
import { store } from '../../../store';
import Duration from '../list/room/duration';

const MyBreakoutRooms = () => {
  const { t } = useTranslation();
  const { data: myRooms, isLoading: isLoadingMyRooms } =
    useGetMyBreakoutRoomsQuery(undefined, {
      pollingInterval: 10000,
    });
  const [joinRoom, { isLoading, data }] = useJoinRoomMutation();
  const [token, setToken] = useState<string>('');
  const userId = store.getState().session.currentUser?.userId ?? '';

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
  }, [token]);

  const join = () => {
    joinRoom(
      create(JoinBreakoutRoomReqSchema, {
        breakoutRoomId: myRooms?.room?.id ?? '',
        userId: store.getState().session.currentUser?.userId ?? '',
      }),
    );
  };

  const render = () => {
    if (!myRooms) {
      return null;
    }
    return (
      <div className="poll-item relative overflow-hidden border border-solid border-primary-color/70 dark:border-dark-text/70 px-2 py-8 rounded-lg mb-4 transition ease-in hover:shadow-md">
        <div className="poll-title text-md text-primary-color dark:text-dark-text">
          {myRooms.room?.title}
        </div>
        <div className="total-vote rounded-bl-lg bg-secondary-color absolute top-0 right-0 text-white text-[10px] py-1 px-3 uppercase">
          <strong>{t('polls.total')}: </strong> {myRooms.room?.users.length}
        </div>

        {myRooms.room?.started ? (
          <div className="status absolute top-0 left-0 text-[10px] text-white">
            <Duration
              duration={BigInt(myRooms.room?.duration) ?? 5}
              created={BigInt(myRooms.room?.created) ?? Date.now()}
            />
          </div>
        ) : (
          <div className="status absolute top-0 left-0 bg-secondary-color text-[10px] text-white py-1 px-3 uppercase rounded-br-lg">
            {t('breakout-room.not-started')}
          </div>
        )}

        <div className="btn">
          <p className="absolute left-2 bottom-2 text-xs dark:text-secondary-color">
            {myRooms.room?.users.filter(
              (u) => u.joined === true && u.id === userId,
            ).length
              ? t('breakout-room.user-joined')
              : t('breakout-room.not-joined')}
          </p>
          <button
            onClick={join}
            className="absolute right-0 bottom-0 transition ease-in bg-primary-color hover:bg-secondary-color text-[10px] text-white pt-1 pb-[2px] px-3 uppercase rounded-tl-lg"
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
          <div className="loading absolute text-center top-1/2 -translate-y-1/2 z-999 left-0 right-0 m-auto">
            <div className="lds-ripple">
              <div className="border-secondary-color" />
              <div className="border-secondary-color" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default MyBreakoutRooms;
