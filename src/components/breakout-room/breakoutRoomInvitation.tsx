import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LocalAudioTrack, Track } from 'livekit-client';
import {
  Dialog,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { toast } from 'react-toastify';
import copy from 'copy-text-to-clipboard';
import { JoinBreakoutRoomReqSchema } from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import { useAppDispatch, useAppSelector } from '../../store';
import { updateReceivedInvitationFor } from '../../store/slices/breakoutRoomSlice';
import { useJoinRoomMutation } from '../../store/services/breakoutRoomApi';
import {
  updateIsActiveWebcam,
  updateIsMicMuted,
  updateVirtualBackground,
} from '../../store/slices/bottomIconsActivitySlice';
import { updateSelectedVideoDevice } from '../../store/slices/roomSettingsSlice';
import { getMediaServerConnRoom } from '../../helpers/livekit/utils';

const BreakoutRoomInvitation = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const currentRoom = getMediaServerConnRoom();

  const receivedInvitationFor = useAppSelector(
    (state) => state.breakoutRoom.receivedInvitationFor,
  );
  const [joinRoom, { isLoading, data }] = useJoinRoomMutation();
  const [joinLink, setJoinLink] = useState<string>('');
  const [copyText, setCopyText] = useState<string>(
    t('breakout-room.copy').toString(),
  );
  const [token, setToken] = useState<string>('');

  const closeLocalTracks = useCallback(() => {
    currentRoom.localParticipant
      .getTrackPublications()
      .forEach(async (publication) => {
        if (!publication.track) {
          return;
        }
        if (publication.track.source === Track.Source.Camera) {
          await currentRoom.localParticipant.unpublishTrack(
            publication.track.mediaStreamTrack,
            true,
          );
          dispatch(updateIsActiveWebcam(false));
          dispatch(updateSelectedVideoDevice(''));
          dispatch(
            updateVirtualBackground({
              type: 'none',
            }),
          );
        } else if (publication.track.source === Track.Source.Microphone) {
          if (!publication.isMuted) {
            const track = publication.audioTrack as LocalAudioTrack;
            await track.unmute();
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
      create(JoinBreakoutRoomReqSchema, {
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
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black opacity-30" />
              </TransitionChild>

              <span
                className="inline-block h-screen align-middle"
                aria-hidden="true"
              >
                &#8203;
              </span>
              <TransitionChild
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

                  <DialogTitle
                    as="h3"
                    className="text-base font-medium leading-6 text-gray-900 dark:text-darkText text-left mb-2"
                  >
                    {t('breakout-room.invitation-title')}
                  </DialogTitle>
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
              </TransitionChild>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  };

  return receivedInvitationFor !== '' ? renderModal() : null;
};

export default React.memo(BreakoutRoomInvitation);
