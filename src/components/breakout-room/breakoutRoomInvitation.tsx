import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { useTranslation } from 'react-i18next';
import { Room, Track } from 'livekit-client';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-toastify';
import copy from 'copy-text-to-clipboard';

import { RootState, useAppDispatch, useAppSelector } from '../../store';
import { updateReceivedInvitationFor } from '../../store/slices/breakoutRoomSlice';
import { useJoinRoomMutation } from '../../store/services/breakoutRoomApi';
import {
  updateIsActiveWebcam,
  updateIsMicMuted,
  updateVirtualBackground,
} from '../../store/slices/bottomIconsActivitySlice';
import { updateSelectedVideoDevice } from '../../store/slices/roomSettingsSlice';
import { JoinBreakoutRoomReq } from '../../helpers/proto/plugnmeet_breakout_room_pb';

interface IBreakoutRoomInvitationProps {
  currentRoom: Room;
}

const receivedInvitationForSelector = createSelector(
  (state: RootState) => state.breakoutRoom,
  (breakoutRoom) => breakoutRoom.receivedInvitationFor,
);

const BreakoutRoomInvitation = ({
  currentRoom,
}: IBreakoutRoomInvitationProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const receivedInvitationFor = useAppSelector(receivedInvitationForSelector);
  const [joinRoom, { isLoading, data }] = useJoinRoomMutation();
  const [joinLink, setJoinLink] = useState<string>('');
  const [copyText, setCopyText] = useState<string>(
    t('breakout-room.copy').toString(),
  );
  const [token, setToken] = useState<string>('');

  const closeLocalTracks = useCallback(() => {
    currentRoom.localParticipant.tracks.forEach(async (publication) => {
      if (!publication.track) {
        return;
      }
      if (publication.track.source === Track.Source.Camera) {
        currentRoom.localParticipant.unpublishTrack(publication.track, true);
        dispatch(updateIsActiveWebcam(false));
        dispatch(updateSelectedVideoDevice(''));
        dispatch(
          updateVirtualBackground({
            type: 'none',
          }),
        );
      } else if (publication.track.source === Track.Source.Microphone) {
        if (!publication.isMuted) {
          await publication.track.unmute();
          dispatch(updateIsMicMuted(true));
        }
      }
    });
  }, [currentRoom.localParticipant, dispatch]);

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

      const opened = window.open(url, '_blank');
      setJoinLink(url);

      if (!opened) {
        setJoinLink(url);
        return;
      }

      dispatch(updateReceivedInvitationFor(''));
      // we should disable running tracks
      closeLocalTracks();
    }
    //eslint-disable-next-line
  }, [token]);

  const closeModal = () => {
    dispatch(updateReceivedInvitationFor(''));
    // we should disable running tracks
    closeLocalTracks();
  };

  const join = () => {
    joinRoom(
      new JoinBreakoutRoomReq({
        breakoutRoomId: receivedInvitationFor,
        userId: currentRoom.localParticipant.identity,
      }),
    );
  };

  const copyUrl = () => {
    copy(joinLink);
    setCopyText(t('breakout-room.copied').toString());
  };

  const renderModal = () => {
    return (
      <>
        <Transition appear show={receivedInvitationFor !== ''} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-[9999] overflow-y-auto"
            onClose={() => false}
            static={false}
          >
            <div className="min-h-screen px-4 text-center flex items-end justify-end">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
              </Transition.Child>

              <span
                className="inline-block h-screen align-middle"
                aria-hidden="true"
              >
                &#8203;
              </span>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <div className="inline-block w-max h-full p-6 my-4 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-darkPrimary shadow-xl rounded-lg">
                  <button
                    className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
                    type="button"
                    onClick={() => closeModal()}
                  >
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
                  </button>

                  <Dialog.Title
                    as="h3"
                    className="text-base font-medium leading-6 text-gray-900 dark:text-darkText text-left mb-2"
                  >
                    {t('breakout-room.invitation-title')}
                  </Dialog.Title>
                  <hr />
                  <div className="mt-2">
                    <span className="text-black dark:text-darkText text-sm">
                      {t('breakout-room.invitation-msg')}
                    </span>

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

                    <div className="button-section flex items-center justify-start">
                      <button
                        className="text-center py-1 px-3 mt-1 text-xs transition ease-in bg-primaryColor hover:bg-secondaryColor text-white font-semibold rounded-lg"
                        onClick={join}
                      >
                        {t('breakout-room.join')}
                      </button>
                    </div>
                  </div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  };

  return receivedInvitationFor !== '' ? renderModal() : null;
};

export default React.memo(BreakoutRoomInvitation);
