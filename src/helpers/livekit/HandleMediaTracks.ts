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

import { IConnectLivekit } from './types';
import { store } from '../../store';
import {
  participantsSelector,
  updateParticipant,
} from '../../store/slices/participantSlice';
import { updateIsMicMuted } from '../../store/slices/bottomIconsActivitySlice';
import {
  ICurrentUser,
  IRoomMetadata,
} from '../../store/slices/interfaces/session';
import { updatePinCamUserId } from '../../store/slices/roomSettingsSlice';
import { removeOneSpeaker } from '../../store/slices/activeSpeakersSlice';

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

    if (participant.identity === this.currentUser?.userId) {
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

    if (participant.identity === this.currentUser?.userId) {
      store.dispatch(updateIsMicMuted(false));
    }
  };

  public trackSubscriptionFailed = (
    track_sid: string,
    participant: RemoteParticipant,
  ) => {
    // To do
    console.log('==== trackSubscriptionFailed ====');
    console.log(participant.name, track_sid);
  };

  public trackStreamStateChanged = (
    _: RemoteTrackPublication,
    streamState: Track.StreamState,
    participant: RemoteParticipant,
  ) => {
    // to do
    console.log('==== trackStreamStateChanged ====');
    console.log(participant.name, streamState);
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
      this.currentUser = store.getState().session.currentUser;
    }

    if (
      participant.identity !== this.currentUser?.userId &&
      track.source === Track.Source.Camera
    ) {
      const user = participantsSelector.selectById(
        store.getState(),
        participant.identity,
      );

      // if admin_only_webcams or allow_view_other_webcams is enabled that time
      // only admin user can see all webcams
      // other user can see only admin users' webcams.
      if (
        (this.roomMetadata.roomFeatures?.adminOnlyWebcams ||
          !this.roomMetadata.roomFeatures?.allowViewOtherWebcams) &&
        !this.currentUser?.metadata?.isAdmin
      ) {
        // We'll check if this user is an admin or not. Otherwise, no webcam will show up.
        if (user && user.metadata && !user.metadata.isAdmin) {
          return;
        }
      }

      if (this.currentUser?.isRecorder) {
        // we'll set up logic for webcam recording
        if (user && user.metadata) {
          if (!user.metadata.recordWebcam) {
            // if record webcam is disabled then we won't load webcams
            return;
          } else if (
            !user.metadata.isAdmin &&
            this.roomMetadata.roomFeatures?.recordingFeatures
              ?.onlyRecordAdminWebcams
          ) {
            // if room setting was enabled to record webcam only for admin,
            // then we'll simply won't load webcams
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
      this.that.addScreenShareTrack(participant.identity, track);
    } else if (track.source === Track.Source.Microphone) {
      this.that.addAudioSubscriber(participant);
      const count = participant
        .getTrackPublications()
        .filter((track) => track.source === Track.Source.Microphone).length;
      // now update store
      store.dispatch(
        updateParticipant({
          id: participant.identity,
          changes: {
            audioTracks: count === 0 ? 1 : count,
            isMuted: track.audioTrack?.isMuted ?? false,
            audioVolume: store.getState().roomSettings.roomAudioVolume,
          },
        }),
      );
    } else if (track.source === Track.Source.Camera) {
      this.that.addVideoSubscriber(participant);
      const count = participant
        .getTrackPublications()
        .filter((track) => track.source === Track.Source.Camera).length;
      // now update store
      store.dispatch(
        updateParticipant({
          id: participant.identity,
          changes: {
            videoTracks: count === 0 ? 1 : count,
          },
        }),
      );
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
      this.that.removeScreenShareTrack(participant.identity);
    } else if (track.source === Track.Source.Microphone) {
      this.that.removeAudioSubscriber(participant.identity);
      // remove from active speaker list as well
      store.dispatch(removeOneSpeaker(participant.identity));
      store.dispatch(
        updateParticipant({
          id: participant.identity,
          changes: {
            audioTracks:
              participant
                .getTrackPublications()
                .filter((track) => track.source === Track.Source.Microphone)
                .length ?? 0,
            isMuted: track.audioTrack?.isMuted ?? false,
          },
        }),
      );
    } else if (track.source === Track.Source.Camera) {
      this.that.removeVideoSubscriber(participant.identity);
      // now update store
      store.dispatch(
        updateParticipant({
          id: participant.identity,
          changes: {
            videoTracks:
              participant
                .getTrackPublications()
                .filter((track) => track.source === Track.Source.Camera)
                .length ?? 0,
          },
        }),
      );

      if (store.getState().roomSettings.pinCamUserId === participant.identity) {
        // so, need to unset
        store.dispatch(updatePinCamUserId(undefined));
      }
    }
  }
}
