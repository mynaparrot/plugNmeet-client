import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LocalAudioTrack, Track } from 'livekit-client';
import {
  Button,
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
import { PopupCloseSVGIcon } from '../../assets/Icons/PopupCloseSVGIcon';

const BreakoutRoomInvitation = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const currentRoom = getMediaServerConnRoom();

  const receivedInvitationFor = useAppSelector(
    (state) => state.breakoutRoom.receivedInvitationFor,
  );
  const [joinRoom, { isLoading, isSuccess, isError, data, error }] =
    useJoinRoomMutation();
  const [joinLink, setJoinLink] = useState<string>('');
  const [copyText, setCopyText] = useState<string>(
    t('breakout-room.copy').toString(),
  );

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
            await track.mute();
            dispatch(updateIsMicMuted(true));
          }
        }
      });
  }, [currentRoom.localParticipant, dispatch]);

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
        // If popup was blocked, show the link to the user.
        setJoinLink(url);
        return;
      }

      // If popup opened successfully, close the invitation and local tracks.
      dispatch(updateReceivedInvitationFor(''));
      closeLocalTracks();
    } else if ((isSuccess && !data?.status) || isError) {
      const msg = data?.msg ?? (error as any)?.data?.msg ?? 'Error';
      toast(t(msg), { type: 'error' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, isError, data, error, t]);

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
    setTimeout(() => {
      setCopyText(t('breakout-room.copy').toString());
    }, 2000);
  };

  if (receivedInvitationFor === '') {
    return null;
  }

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog
        as="div"
        className="breakoutRoomModalInvite fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70 dark:bg-Gray-950/80"
        onClose={closeModal}
      >
        <div className="min-h-full flex p-4 items-end justify-end">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-max h-full bg-white dark:bg-dark-primary border border-Gray-200 dark:border-Gray-800 shadow-virtualPOP p-4 rounded-xl overflow-hidden duration-300 ease-out">
              <DialogTitle
                as="h3"
                className="flex items-center justify-between text-base font-semibold leading-7 text-Gray-950 dark:text-white mb-2 border-b border-Gray-300 dark:border-Gray-800 pb-2"
              >
                <span>{t('breakout-room.invitation-title')}</span>
                <Button className="cursor-pointer" onClick={closeModal}>
                  <PopupCloseSVGIcon classes="text-Gray-600" />
                </Button>
              </DialogTitle>
              <div className="mt-2">
                <span className="text-black dark:text-white text-sm">
                  {t('breakout-room.invitation-msg')}
                </span>

                {joinLink !== '' && (
                  <div className="invite-link mt-2">
                    <label className="text-black dark:text-white text-sm block mb-1">
                      {t('breakout-room.join-text-label')}
                    </label>
                    <div className="wrap flex items-center gap-1">
                      <input
                        type="text"
                        readOnly={true}
                        value={joinLink}
                        className="border border-Gray-300 dark:border-Gray-800 bg-white dark:bg-dark-primary shadow-input block px-3 py-2 w-full h-7 rounded-[15px] outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus text-white hover:text-Gray-950"
                      />
                      <button
                        onClick={copyUrl}
                        className="primary-button h-7 ml-auto px-5 cursor-pointer text-sm font-medium bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
                      >
                        {copyText}
                      </button>
                    </div>
                  </div>
                )}

                <div className="button-section flex items-center justify-start mt-4">
                  <button
                    className="primary-button h-7 ml-auto px-5 cursor-pointer text-sm font-medium bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={join}
                    disabled={isLoading}
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
  );
};

export default React.memo(BreakoutRoomInvitation);
