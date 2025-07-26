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
            className="breakoutRoomModalInvite fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70"
            onClose={() => false}
            static={false}
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
                <div className="inline-block w-max h-full bg-white border border-Gray-200 shadow-virtualPOP p-4 rounded-xl overflow-hidden duration-300 ease-out">
                  <DialogTitle
                    as="h3"
                    className="flex items-center justify-between text-base font-semibold leading-7 text-Gray-950 mb-2"
                  >
                    <span>{t('breakout-room.invitation-title')}</span>
                    <Button
                      className="cursor-pointer"
                      onClick={() => closeModal()}
                    >
                      <PopupCloseSVGIcon classes="text-Gray-600" />
                    </Button>
                  </DialogTitle>
                  <hr />
                  <div className="mt-2">
                    <span className="text-black text-sm">
                      {t('breakout-room.invitation-msg')}
                    </span>

                    {joinLink !== '' ? (
                      <div className="invite-link mt-2">
                        <label className="text-black text-sm block mb-1">
                          {t('breakout-room.join-text-label')}
                        </label>
                        <div className="wrap flex items-center gap-1">
                          <input
                            type="text"
                            readOnly={true}
                            value={joinLink}
                            className="border border-Gray-300 bg-white shadow-input block px-3 py-2 w-full h-7 rounded-[15px] outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus"
                          />
                          <button
                            onClick={copyUrl}
                            className="h-7 ml-auto px-5 flex items-center justify-center rounded-xl text-sm font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-button-shadow"
                          >
                            {copyText}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="button-section flex items-center justify-start mt-4">
                      <button
                        className="h-7 ml-auto px-5 flex items-center justify-center rounded-xl text-sm font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-button-shadow"
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
