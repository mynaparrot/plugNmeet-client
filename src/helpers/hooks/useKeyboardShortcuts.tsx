import { Room, Track } from 'livekit-client';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTranslation } from 'react-i18next';
import {
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
} from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import { store, useAppDispatch } from '../../store';
import {
  updateIsActiveChatPanel,
  updateIsActiveMicrophone,
  updateIsActiveParticipantsPanel,
  updateIsActiveWebcam,
  updateIsActiveWhiteboard,
  updateIsMicMuted,
  updateShowLockSettingsModal,
  updateShowMicrophoneModal,
  updateShowVideoShareModal,
  updateVirtualBackground,
} from '../../store/slices/bottomIconsActivitySlice';
import {
  updateSelectedAudioDevice,
  updateSelectedVideoDevice,
  updateShowRoomSettingsModal,
} from '../../store/slices/roomSettingsSlice';
import { getNatsConn } from '../nats';

const useKeyboardShortcuts = (currentRoom?: Room) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  // muteUnmute start (ctrl+option+m)
  const muteUnmute = (currentRoom: Room) => {
    if (currentRoom) {
      currentRoom.localParticipant.audioTrackPublications.forEach(
        async (publication) => {
          if (
            publication.track &&
            publication.track.source === Track.Source.Microphone
          ) {
            if (publication.isMuted) {
              await publication.track.unmute();
              dispatch(updateIsMicMuted(false));
            } else {
              await publication.track.mute();
              dispatch(updateIsMicMuted(true));
            }
          }
        },
      );
    }
  };

  useHotkeys(
    'ctrl+alt+m',
    () => {
      if (currentRoom) {
        muteUnmute(currentRoom);
      }
    },
    [currentRoom],
  );
  // muteUnmute end (ctrl+option+m)

  // start audio (ctrl+alt+a)
  useHotkeys('ctrl+alt+a', () => {
    const bottomIconsActivity = store.getState().bottomIconsActivity;
    if (
      !bottomIconsActivity.isActiveMicrophone &&
      !bottomIconsActivity.showMicrophoneModal
    ) {
      dispatch(updateShowMicrophoneModal(true));
    }
  });

  // leaveMic start (ctrl+alt+o)
  const leaveMic = (currentRoom: Room) => {
    currentRoom.localParticipant.audioTrackPublications.forEach(
      async (publication) => {
        if (publication.track && publication.kind === Track.Kind.Audio) {
          await currentRoom.localParticipant.unpublishTrack(
            publication.track,
            true,
          );
        }
      },
    );
    dispatch(updateIsActiveMicrophone(false));
    dispatch(updateIsMicMuted(false));
    dispatch(updateSelectedAudioDevice(''));
  };

  useHotkeys(
    'ctrl+alt+o',
    () => {
      if (currentRoom) {
        leaveMic(currentRoom);
      }
    },
    [currentRoom],
  );
  // leaveMic end (ctrl+alt+o)

  // start video (ctrl+alt+v)
  useHotkeys('ctrl+alt+v', () => {
    const bottomIconsActivity = store.getState().bottomIconsActivity;
    if (
      !bottomIconsActivity.isActiveWebcam &&
      !bottomIconsActivity.showVideoShareModal
    ) {
      dispatch(updateShowVideoShareModal(true));
    }
  });

  // start close video (ctrl+alt+x)
  const leaveWebcam = (currentRoom: Room) => {
    currentRoom.localParticipant.videoTrackPublications.forEach(
      async (publication) => {
        if (
          publication.track &&
          publication.track.source === Track.Source.Camera
        ) {
          await currentRoom.localParticipant.unpublishTrack(
            publication.track,
            true,
          );
        }
      },
    );
    dispatch(updateIsActiveWebcam(false));
    dispatch(updateSelectedVideoDevice(''));
    dispatch(
      updateVirtualBackground({
        type: 'none',
      }),
    );
  };

  useHotkeys(
    'ctrl+alt+x',
    () => {
      if (currentRoom) {
        const isActiveWebcam =
          store.getState().bottomIconsActivity.isActiveWebcam;
        if (isActiveWebcam) {
          leaveWebcam(currentRoom);
        }
      }
    },
    [currentRoom],
  );
  // close video (ctrl+alt+x) end

  // toggle users' list (ctrl+alt+u)
  useHotkeys('ctrl+alt+u', () => {
    const isActiveParticipantsPanel =
      store.getState().bottomIconsActivity.isActiveParticipantsPanel;
    dispatch(updateIsActiveParticipantsPanel(!isActiveParticipantsPanel));
  });

  // toggle chat (ctrl+alt+c)
  useHotkeys('ctrl+alt+c', () => {
    const isActiveChatPanel =
      store.getState().bottomIconsActivity.isActiveChatPanel;
    dispatch(updateIsActiveChatPanel(!isActiveChatPanel));
  });

  // toggle locks options (ctrl+alt+l)
  useHotkeys('ctrl+alt+l', () => {
    const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;
    if (!isAdmin) {
      return;
    }
    const showLockSettingsModal =
      store.getState().bottomIconsActivity.showLockSettingsModal;
    dispatch(updateShowLockSettingsModal(!showLockSettingsModal));
  });

  // toggle settings (ctrl+alt+s)
  useHotkeys('ctrl+alt+s', () => {
    const isShowRoomSettingsModal =
      store.getState().roomSettings.isShowRoomSettingsModal;
    dispatch(updateShowRoomSettingsModal(!isShowRoomSettingsModal));
  });

  // toggle whiteboard (ctrl+alt+w)
  useHotkeys('ctrl+alt+w', () => {
    const isActiveWhiteboard =
      store.getState().bottomIconsActivity.isActiveWhiteboard;
    dispatch(updateIsActiveWhiteboard(!isActiveWhiteboard));
  });

  // toggle raise hand (ctrl+alt+r) start
  const toggleRaiseHand = async (
    isActiveRaisehand: boolean,
    currentRoom: Room,
  ) => {
    const conn = getNatsConn();
    const data = create(NatsMsgClientToServerSchema, {});

    if (!isActiveRaisehand) {
      data.event = NatsMsgClientToServerEvents.REQ_RAISE_HAND;
      data.msg = t('footer.notice.has-raised-hand', {
        user: currentRoom.localParticipant.name,
      }).toString();
    } else {
      data.event = NatsMsgClientToServerEvents.REQ_LOWER_HAND;
    }

    conn.sendMessageToSystemWorker(data);
  };

  useHotkeys(
    'ctrl+alt+r',
    async () => {
      if (currentRoom) {
        const isActiveRaisehand =
          store.getState().bottomIconsActivity.isActiveRaisehand;
        await toggleRaiseHand(isActiveRaisehand, currentRoom);
      }
    },
    [currentRoom],
  );
  // toggle raise hand (ctrl+alt+r) end
};

export default useKeyboardShortcuts;
