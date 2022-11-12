import {
  ConnectionQuality,
  LocalParticipant,
  Participant,
  RemoteParticipant,
  Track,
} from 'livekit-client';
import { toast } from 'react-toastify';

import { store } from '../../store';
import i18n from '../i18n';
import {
  addParticipant,
  participantsSelector,
  removeParticipant,
  updateParticipant,
} from '../../store/slices/participantSlice';
import { ICurrentUserMetadata } from '../../store/slices/interfaces/session';
import {
  updateScreenSharing,
  updateCurrentUserMetadata,
} from '../../store/slices/sessionSlice';
import { IConnectLivekit } from './types';
import {
  updateIsActiveParticipantsPanel,
  updateIsActiveRaisehand,
} from '../../store/slices/bottomIconsActivitySlice';
import { removeOneSpeaker } from '../../store/slices/activeSpeakersSlice';

export default class HandleParticipants {
  private that: IConnectLivekit;
  private isRecorderJoin = false;
  private participantsCount = 0;
  private participantCounterInterval: any = 0;

  constructor(that: IConnectLivekit) {
    this.that = that;
  }

  public recorderJoined() {
    this.isRecorderJoin = true;
    this.startParticipantCounter();
    //store.dispatch(updateIsActiveChatPanel(false));
    store.dispatch(updateIsActiveParticipantsPanel(false));
  }

  public clearParticipantCounterInterval() {
    if (this.participantCounterInterval) {
      clearInterval(this.participantCounterInterval);
    }
  }

  /*
   * startParticipantCounter will only call if participant was a recorder or RTMP bot
   * */
  private startParticipantCounter() {
    this.participantCounterInterval = setInterval(() => {
      if (this.participantsCount === 0) {
        console.log('NO_USER_ONLINE');
        this.that.room.disconnect();
      }
    }, 3000);
  }

  public participantConnected = (participant: RemoteParticipant) => {
    this.addParticipant(participant);
  };

  public addParticipant = (
    participant: RemoteParticipant | LocalParticipant,
  ) => {
    let metadata;
    if (participant.metadata) {
      try {
        metadata = JSON.parse(participant.metadata);
        this.notificationForWaitingUser(metadata, participant.name);
      } catch (e) {}
    }

    let videoTracksCount = 0,
      audioTracksCount = 0,
      screenShareTrackCount = 0,
      isMuted = false;
    participant.getTracks().forEach((t) => {
      if (t.source === Track.Source.Camera) {
        videoTracksCount += 1;
      } else if (t.source === Track.Source.Microphone) {
        audioTracksCount += 1;
        isMuted = t.isMuted;
      } else if (
        t.source === Track.Source.ScreenShare ||
        t.source === Track.Source.ScreenShareAudio
      ) {
        screenShareTrackCount = 1;
      }
    });

    store.dispatch(
      addParticipant({
        sid: participant.sid,
        userId: participant.identity,
        name: participant.name ?? '',
        metadata: metadata ? metadata : null,
        audioTracks: audioTracksCount,
        videoTracks: videoTracksCount,
        screenShareTrack: screenShareTrackCount,
        isMuted: isMuted,
        connectionQuality: participant.connectionQuality,
        isLocal: false,
        joinedAt: participant.joinedAt?.getTime() ?? Date.now(),
        visibility: 'visible',
      }),
    );

    if (this.isRecorderJoin) {
      this.participantsCount++;
    }
  };

  public participantDisconnected = (participant: RemoteParticipant) => {
    this.removeParticipant(participant);
    if (this.isRecorderJoin) {
      this.participantsCount--;
    }
  };

  private removeParticipant = (p: RemoteParticipant) => {
    const participant = participantsSelector.selectById(
      store.getState(),
      p.identity,
    );
    if (participant?.screenShareTrack) {
      store.dispatch(
        updateScreenSharing({
          isActive: false,
          sharedBy: '',
        }),
      );
    }
    // now remove user.
    store.dispatch(removeParticipant(p.identity));

    // remove if in active speaker
    store.dispatch(removeOneSpeaker(p.identity));

    // now remove webcam
    this.that.updateVideoSubscribers(p, false);
    // now remove audio
    this.that.updateAudioSubscribers(p, false);
    // check for screen sharing
    this.that.updateScreenShareOnUserDisconnect(p);
  };

  public connectionQualityChanged = (
    connectionQuality: ConnectionQuality,
    participant: Participant,
  ) => {
    store.dispatch(
      updateParticipant({
        id: participant.identity,
        changes: {
          connectionQuality: connectionQuality,
        },
      }),
    );

    if (connectionQuality === ConnectionQuality.Poor) {
      if (
        participant.sid === this.that.room.localParticipant.sid &&
        !(
          participant.identity === 'RECORDER_BOT' ||
          participant.identity === 'RTMP_BOT'
        )
      ) {
        toast(i18n.t('notifications.your-connection-quality-not-good'), {
          toastId: 'connection-status',
          type: 'error',
        });
      }
    }
  };

  public setParticipantMetadata = (
    _: string | undefined,
    participant: Participant,
  ) => {
    if (participant.metadata) {
      const metadata: ICurrentUserMetadata = JSON.parse(participant.metadata);
      store.dispatch(
        updateParticipant({
          id: participant.identity,
          changes: {
            metadata,
          },
        }),
      );

      if (this.that.room.localParticipant.sid === participant.sid) {
        store.dispatch(updateCurrentUserMetadata(metadata));
        store.dispatch(updateIsActiveRaisehand(metadata.raised_hand));
      }
    }
  };

  private notificationForWaitingUser(metadata: ICurrentUserMetadata, name) {
    if (
      metadata.wait_for_approval &&
      store.getState().session.currentUser?.metadata?.is_admin
    ) {
      toast(
        i18n.t('waiting-room.user-waiting', {
          name: name,
        }),
        {
          type: 'info',
          toastId: 'user-waiting',
        },
      );
    }
  }
}
