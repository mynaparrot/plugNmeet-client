import React, { useCallback, useEffect, useRef } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Room, Track } from 'livekit-client';

import { RootState, useAppDispatch, useAppSelector } from '../../store';
import { updateReceivedInvitationFor } from '../../store/slices/breakoutRoomSlice';
import { useJoinRoomMutation } from '../../store/services/breakoutRoomApi';
import {
  updateIsActiveWebcam,
  updateIsMicMuted,
  updateVirtualBackground,
} from '../../store/slices/bottomIconsActivitySlice';
import { updateSelectedVideoDevice } from '../../store/slices/roomSettingsSlice';

interface IBreakoutRoomInvitationProps {
  currentRoom: Room;
}

const receivedInvitationForSelector = createSelector(
  (state: RootState) => state.breakoutRoom.receivedInvitationFor,
  (receivedInvitationFor) => receivedInvitationFor,
);

const BreakoutRoomInvitation = ({
  currentRoom,
}: IBreakoutRoomInvitationProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const toastId = useRef<string>(null);
  const receivedInvitationFor = useAppSelector(receivedInvitationForSelector);
  const [joinRoom, { isLoading, data }] = useJoinRoomMutation();

  useEffect(() => {
    if (receivedInvitationFor !== '') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      toastId.current = toast(renderInvitationMsg(), {
        autoClose: false,
        closeButton: false,
        position: 'bottom-right',
      });
    }
    //eslint-disable-next-line
  }, [receivedInvitationFor]);

  const closeLocalTracks = useCallback(() => {
    currentRoom.localParticipant.tracks.forEach(async (publication) => {
      if (!publication.track) {
        return;
      }
      if (publication.track.source === Track.Source.Camera) {
        currentRoom.localParticipant.unpublishTrack(publication.track);
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
        return;
      }

      toast.dismiss(toastId.current ?? '');
      dispatch(updateReceivedInvitationFor(''));
      // we should disable running tracks
      closeLocalTracks();
    }
    //eslint-disable-next-line
  }, [isLoading, data]);

  const join = () => {
    joinRoom({
      breakout_room_id: receivedInvitationFor,
      user_id: currentRoom.localParticipant.identity,
    });
  };

  const renderInvitationMsg = () => {
    return (
      <>
        <span className="text-black">{t('breakout-room.invitation-msg')}</span>
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

  return null;
};

export default React.memo(BreakoutRoomInvitation);
