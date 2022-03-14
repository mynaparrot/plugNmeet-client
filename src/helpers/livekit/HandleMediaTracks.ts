import {
  LocalParticipant,
  LocalTrackPublication,
  Participant,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Track,
  TrackPublication,
} from 'livekit-client';

import { IConnectLivekit } from './ConnectLivekit';
import { store } from '../../store';
import { updateParticipant } from '../../store/slices/participantSlice';
import { updateScreenSharing } from '../../store/slices/sessionSlice';
import { updateIsMicMuted } from '../../store/slices/bottomIconsActivitySlice';
import {
  ICurrentUser,
  ICurrentUserMetadata,
  IRoomMetadata,
} from '../../store/slices/interfaces/session';

export default class HandleMediaTracks {
  private that: IConnectLivekit;
  private roomMetadata: IRoomMetadata | undefined;
  private currentUser: ICurrentUser | undefined;

  constructor(that: IConnectLivekit) {
    this.that = that;
  }

  public localTrackPublished = (
    track: LocalTrackPublication,
    participant: LocalParticipant,
  ) => {
    this.addSubscriber(track, participant);
  };

  public localTrackUnpublished = (
    track: LocalTrackPublication,
    participant: LocalParticipant,
  ) => {
    this.removeSubscriber(track, participant);
  };

  public trackSubscribed = (
    _: RemoteTrack,
    track: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    this.addSubscriber(track, participant);
  };

  public trackUnsubscribed = (
    track: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    this.removeSubscriber(track, participant);
  };

  public trackMuted = (_: TrackPublication, participant: Participant) => {
    store.dispatch(
      updateParticipant({
        id: participant.identity,
        changes: {
          isMuted: true,
        },
      }),
    );

    if (participant.identity === store.getState().session.currenUser?.userId) {
      store.dispatch(updateIsMicMuted(true));
    }
  };

  public trackUnmuted = (_: TrackPublication, participant: Participant) => {
    store.dispatch(
      updateParticipant({
        id: participant.identity,
        changes: {
          isMuted: false,
        },
      }),
    );

    if (participant.identity === store.getState().session.currenUser?.userId) {
      store.dispatch(updateIsMicMuted(false));
    }
  };

  public trackSubscriptionFailed = (
    track_sid: string,
    participant: RemoteParticipant,
  ) => {
    // To do
    console.log('==== trackSubscriptionFailed ====');
    console.log(track_sid, participant);
  };

  public trackStreamStateChanged = (
    _: RemoteTrackPublication,
    streamState: Track.StreamState,
    participant: RemoteParticipant,
  ) => {
    // to do
    console.log(streamState, participant.name);
  };

  private addSubscriber(
    track: LocalTrackPublication | RemoteTrackPublication,
    participant: LocalParticipant | RemoteParticipant,
  ) {
    if (!this.roomMetadata) {
      this.roomMetadata = store.getState().session.currentRoom
        .metadata as IRoomMetadata;
    }
    if (!this.currentUser) {
      this.currentUser = store.getState().session.currenUser;
    }

    if (
      participant.identity !== this.currentUser?.userId &&
      track.source === Track.Source.Camera
    ) {
      // if admin_only_webcams or allow_view_other_webcams is enable that time
      // only admin user can see all webcams
      // other user can see only admin users' webcams.
      if (
        (this.roomMetadata.room_features?.admin_only_webcams ||
          !this.roomMetadata.room_features?.allow_view_other_webcams) &&
        !this.currentUser?.metadata?.is_admin
      ) {
        if (participant.metadata) {
          const metadata: ICurrentUserMetadata = JSON.parse(
            participant.metadata,
          );
          // we'll check if user is an admin or not. Otherwise no webcam will show up.
          if (!metadata.is_admin) {
            return;
          }
        }
      }
    }

    if (
      track.source === Track.Source.ScreenShare ||
      track.source === Track.Source.ScreenShareAudio
    ) {
      store.dispatch(
        updateParticipant({
          id: participant.identity,
          changes: {
            screenShareTrack: 1,
          },
        }),
      );
      store.dispatch(
        updateScreenSharing({
          isActive: true,
          sharedBy: participant.identity,
        }),
      );
      this.that.setScreenShareTrack(track, participant, true);
    } else {
      store.dispatch(
        updateParticipant({
          id: participant.identity,
          changes: {
            videoTracks: participant
              .getTracks()
              .filter((track) => track.source === Track.Source.Camera).length,
            audioTracks: participant
              .getTracks()
              .filter((track) => track.source === Track.Source.Microphone)
              .length,
          },
        }),
      );

      if (track.source === Track.Source.Microphone) {
        this.that.updateAudioSubscribers(participant);
        store.dispatch(
          updateParticipant({
            id: participant.identity,
            changes: {
              isMuted: track.audioTrack?.isMuted,
            },
          }),
        );
      } else if (track.source === Track.Source.Camera) {
        this.that.updateVideoSubscribers(participant);
      }
    }
  }

  private removeSubscriber(
    track: LocalTrackPublication | RemoteTrackPublication,
    participant: LocalParticipant | RemoteParticipant,
  ) {
    if (
      track.source === Track.Source.ScreenShare ||
      track.source === Track.Source.ScreenShareAudio
    ) {
      store.dispatch(
        updateParticipant({
          id: participant.identity,
          changes: {
            screenShareTrack: 0,
          },
        }),
      );
      store.dispatch(
        updateScreenSharing({
          isActive: false,
          sharedBy: '',
        }),
      );
      this.that.setScreenShareTrack(track, participant, false);
    } else {
      store.dispatch(
        updateParticipant({
          id: participant.identity,
          changes: {
            videoTracks: participant
              .getTracks()
              .filter((track) => track.source === Track.Source.Camera).length,
            audioTracks: participant
              .getTracks()
              .filter((track) => track.source === Track.Source.Microphone)
              .length,
            isMuted: track.audioTrack?.isMuted,
          },
        }),
      );

      if (track.source === Track.Source.Microphone) {
        this.that.updateAudioSubscribers(participant, false);
      } else if (track.source === Track.Source.Camera) {
        this.that.updateVideoSubscribers(participant, false);
      }
    }
  }
}
