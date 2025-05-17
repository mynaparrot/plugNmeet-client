import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from '@bufbuild/protobuf';
import copy from 'copy-text-to-clipboard';

import { store, useAppDispatch } from '../../../store';
import { JoinBreakoutRoomReqSchema } from 'plugnmeet-protocol-js';
import { useJoinRoomMutation } from '../../../store/services/breakoutRoomApi';
import { updateReceivedInvitationFor } from '../../../store/slices/breakoutRoomSlice';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';

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
    <>
      <span className="text-black dark:text-darkText">
        {t('breakout-room.invitation-msg')}
      </span>
      <div>
        {joinLink !== '' ? (
          <div className="invite-link">
            <label className="text-black dark:text-darkText text-sm">
              {t('breakout-room.join-text-label')}
            </label>
            <input
              type="text"
              readOnly={true}
              value={joinLink}
              className="inline-block outline-none border border-solid rounded p-1 h-7 text-sm mx-1 bg-transparent dark:text-darkText dark:border-darkText"
            />
            <button
              onClick={copyUrl}
              className="text-center py-1 px-3 text-xs transition ease-in bg-primaryColor hover:bg-secondaryColor text-white font-semibold rounded-lg"
            >
              {copyText}
            </button>
          </div>
        ) : null}
      </div>
      <div className="button-section flex items-center justify-start">
        <button
          className="text-center py-1 px-3 mt-1 text-xs transition ease-in bg-primaryColor hover:bg-secondaryColor text-white font-semibold rounded-lg"
          onClick={join}
        >
          {t('breakout-room.join')}
        </button>
      </div>
    </>
  );
};

export default NewBreakoutRoom;
