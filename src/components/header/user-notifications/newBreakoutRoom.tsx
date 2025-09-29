import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from '@bufbuild/protobuf';
import copy from 'copy-text-to-clipboard';

import { store, useAppDispatch } from '../../../store';
import { JoinBreakoutRoomReqSchema } from 'plugnmeet-protocol-js';
import { useJoinRoomMutation } from '../../../store/services/breakoutRoomApi';
import { updateReceivedInvitationFor } from '../../../store/slices/breakoutRoomSlice';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';
import { BreakoutRoomIconSVG } from '../../../assets/Icons/BreakoutRoomIconSVG';

interface NewBreakoutRoomProps {
  receivedInvitationFor: string | undefined;
}

const NewBreakoutRoom = ({ receivedInvitationFor }: NewBreakoutRoomProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [joinRoom, { isLoading, data }] = useJoinRoomMutation();

  const [joinLink, setJoinLink] = useState<string>('');
  const [copyText, setCopyText] = useState<string>(
    t('breakout-room.copy').toString(),
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
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.set('access_token', data.token);
        const url =
          location.protocol +
          '//' +
          location.host +
          window.location.pathname +
          '?' +
          searchParams.toString();

        const opened = window.open(url, '_blank');
        setJoinLink(url);

        if (!opened) {
          setJoinLink(url);
          return;
        }

        dispatch(updateReceivedInvitationFor(''));
      }
    }
    //eslint-disable-next-line
  }, [isLoading, data]);

  const join = () => {
    if (!receivedInvitationFor) {
      addUserNotification({
        message: t('breakout-room.user-joined'),
        typeOption: 'error',
        newInstance: true,
      });
      return;
    }
    const userId = store.getState().session.currentUser?.userId;
    joinRoom(
      create(JoinBreakoutRoomReqSchema, {
        breakoutRoomId: receivedInvitationFor,
        userId: userId,
      }),
    );
  };

  const copyUrl = () => {
    copy(joinLink);
    setCopyText(t('breakout-room.copied').toString());
  };

  return (
    <div className="notification notif-breakoutRoom flex gap-4 py-2 px-4 border-b border-Gray-200">
      <div className="icon w-9 h-9 rounded-full bg-Gray-100 text-Blue2-800 relative inline-flex items-center justify-center">
        <BreakoutRoomIconSVG classes="w-[15px]" />
      </div>
      <div className="text flex-1 text-Gray-800 text-sm">
        <p>
          {/* Poll created:{' '}
                  <strong>“How was today’s class?”</strong> */}
          {t('breakout-room.invitation-msg')}
        </p>
        {joinLink !== '' ? (
          <div className="invite-link">
            <label className="text-black dark:text-dark-text text-sm">
              {t('breakout-room.join-text-label')}
            </label>
            <input
              type="text"
              readOnly={true}
              value={joinLink}
              className="inline-block outline-hidden border border-solid rounded-sm p-1 h-7 text-sm mx-1 bg-transparent dark:text-dark-text dark:border-dark-text"
            />
            <button
              onClick={copyUrl}
              className="text-center py-1 px-3 text-xs transition ease-in bg-primary-color hover:bg-secondary-color text-white font-semibold rounded-lg"
            >
              {copyText}
            </button>
          </div>
        ) : null}
        <div className="bottom flex justify-between text-Gray-800 text-xs items-center">
          <span className="">12:04 AM</span>{' '}
          <button
            onClick={join}
            className="h-6 cursor-pointer px-2 flex items-center gap-1 text-xs font-semibold bg-Blue2-500 hover:bg-Blue2-600 border border-Blue2-600 rounded-[8px] text-white transition-all duration-300 shadow-button-shadow"
          >
            {t('breakout-room.join')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewBreakoutRoom;
