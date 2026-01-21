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
import {
  addOrUpdateSpeaker,
  removeOneSpeaker,
} from '../../store/slices/activeSpeakersSlice';
import {
  addAudioStream,
  removeAudioStream,
} from '../libs/AudioActivityManager';
import { toPlugNmeetUserId } from '../utils';

export default class HandleMediaTracks {
  private connectLivekit: IConnectLivekit;
  private roomMetadata: IRoomMetadata | undefined;
  private currentUser: ICurrentUser | undefined;

  constructor(connectLivekit: IConnectLivekit) {
    this.connectLivekit = connectLivekit;
    const { currentUser, currentRoom } = store.getState().session;
    this.roomMetadata = currentRoom.metadata;
    this.currentUser = currentUser;
  }

  public localTrackPublished = (
    track: LocalTrackPublication,
    participant: LocalParticipant,
  ) => {
    this.addSubscriber(track, participant);
    this.addSpeaker(track, participant);
  };

  public localTrackUnpublished = (
    track: LocalTrackPublication,
    participant: LocalParticipant,
  ) => {
    this.removeSubscriber(track, participant);
    this.removeSpeaker(track, participant);
  };

  public trackSubscribed = (
    _: RemoteTrack,
    track: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    this.addSubscriber(track, participant);
    this.addSpeaker(track, participant);
    // we can also update connectLivekit quality
    store.dispatch(
      updateParticipant({
        id: participant.identity,
        changes: {
          connectionQuality: participant.connectionQuality,
        },
      }),
    );
  };

  public trackUnsubscribed = (
    track: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    this.removeSubscriber(track, participant);
    this.removeSpeaker(track, participant);
  };

  public trackMuted = (track: TrackPublication, participant: Participant) => {
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
    this.removeSpeaker(track, participant);
  };

  public trackUnmuted = (track: TrackPublication, participant: Participant) => {
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
    this.addSpeaker(track, participant);
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

  private _shouldAddWebcam(participant: Participant): boolean {
    // Always add to display own webcam.
    if (participant.identity === this.currentUser?.userId) {
      return true;
    }

    const user = participantsSelector.selectById(
      store.getState(),
      participant.identity,
    );

    // If we don't have the participant's metadata, deny subscription as a precaution.
    if (!user?.metadata) {
      return false;
    }

    // Handle recorder-specific logic.
    if (this.currentUser?.isRecorder) {
      const recordingFeatures =
        this.roomMetadata?.roomFeatures?.recordingFeatures;

      // Deny if the user has disabled webcam recording for themselves.
      if (user.metadata.recordWebcam === false) {
        return false;
      }
      // Deny if the room is set to only record admins and this user is not an admin.
      if (recordingFeatures?.onlyRecordAdminWebcams && !user.metadata.isAdmin) {
        return false;
      }
      // Otherwise, the recorder can subscribe.
      return true;
    }

    // Handle regular user webcam view permissions.
    const { adminOnlyWebcams, allowViewOtherWebcams } =
      this.roomMetadata?.roomFeatures || {};

    // If webcam viewing is restricted and the current user is not an admin...
    if (
      (adminOnlyWebcams || !allowViewOtherWebcams) &&
      !this.currentUser?.metadata?.isAdmin
    ) {
      // ...then they can only see webcams of other admin users.
      return user.metadata.isAdmin;
    }

    // If no specific restrictions apply, allow the subscription.
    return true;
  }

  private addSubscriber(
    track: LocalTrackPublication | RemoteTrackPublication,
    participant: LocalParticipant | RemoteParticipant,
  ) {
    if (!this.roomMetadata) {
      this.roomMetadata = store.getState().session.currentRoom.metadata;
    }
    if (!this.currentUser) {
      this.currentUser = store.getState().session.currentUser;
    }

    switch (track.source) {
      case Track.Source.ScreenShare:
      case Track.Source.ScreenShareAudio: {
        store.dispatch(
          updateParticipant({
            id: participant.identity,
            changes: { screenShareTrack: 1 },
          }),
        );
        this.connectLivekit.addScreenShareTrack(participant.identity, track);
        break;
      }
      case Track.Source.Microphone: {
        const count = participant
          .getTrackPublications()
          .filter((t) => t.source === Track.Source.Microphone).length;

        const userId = toPlugNmeetUserId(participant.identity);
        store.dispatch(
          updateParticipant({
            id: userId,
            changes: {
              audioTracks: count,
              isMuted: track.audioTrack?.isMuted ?? false,
              audioVolume: store.getState().roomSettings.roomAudioVolume,
            },
          }),
        );
        this.connectLivekit.addAudioSubscriber(participant);
        break;
      }
      case Track.Source.Camera: {
        if (!this._shouldAddWebcam(participant)) {
          // If the current user doesn't have permission, stop here.
          return;
        }
        const count = participant
          .getTrackPublications()
          .filter((t) => t.source === Track.Source.Camera).length;
        store.dispatch(
          updateParticipant({
            id: participant.identity,
            changes: { videoTracks: count },
          }),
        );
        this.connectLivekit.addVideoSubscriber(participant);
        break;
      }
    }
  }

  private removeSubscriber(
    track: LocalTrackPublication | RemoteTrackPublication,
    participant: LocalParticipant | RemoteParticipant,
  ) {
    switch (track.source) {
      case Track.Source.ScreenShare:
      case Track.Source.ScreenShareAudio: {
        store.dispatch(
          updateParticipant({
            id: participant.identity,
            changes: { screenShareTrack: 0 },
          }),
        );
        this.connectLivekit.removeScreenShareTrack(participant.identity);
        break;
      }
      case Track.Source.Microphone: {
        const userId = toPlugNmeetUserId(participant.identity);
        this.connectLivekit.removeAudioSubscriber(participant.identity);
        store.dispatch(
          updateParticipant({
            id: userId,
            changes: {
              audioTracks:
                participant
                  .getTrackPublications()
                  .filter((t) => t.source === Track.Source.Microphone).length ??
                0,
              isMuted: track.audioTrack?.isMuted ?? false,
            },
          }),
        );
        break;
      }
      case Track.Source.Camera: {
        this.connectLivekit.removeVideoSubscriber(participant.identity);
        store.dispatch(
          updateParticipant({
            id: participant.identity,
            changes: {
              videoTracks:
                participant
                  .getTrackPublications()
                  .filter((t) => t.source === Track.Source.Camera).length ?? 0,
            },
          }),
        );

        if (
          store.getState().roomSettings.pinCamUserId === participant.identity
        ) {
          // so, need to unset
          store.dispatch(updatePinCamUserId(undefined));
        }
        break;
      }
    }
  }

  /**
   * addSpeaker will only add speaker is track was from microphone
   * so, it can be trigger from any track
   * @param track
   * @param participant
   * @private
   */
  private addSpeaker(track: TrackPublication, participant: Participant) {
    if (
      track.source !== Track.Source.Microphone ||
      !track.audioTrack ||
      !track.audioTrack.mediaStream ||
      track.audioTrack.isMuted
    ) {
      return;
    }

    addAudioStream(track.audioTrack.mediaStream, (activity) => {
      store.dispatch(
        addOrUpdateSpeaker({
          userId: toPlugNmeetUserId(participant.identity),
          name: participant.name ?? '',
          isSpeaking: activity.isSpeaking,
          audioLevel: activity.audioLevel,
          lastSpokeAt: activity.lastSpokeAt,
        }),
      );
    }).then();
  }

  /**
   * removeSpeaker will only remove speaker is track was from microphone
   * @param track
   * @param participant
   * @private
   */
  private removeSpeaker(track: TrackPublication, participant: Participant) {
    if (
      track.source !== Track.Source.Microphone ||
      !track.audioTrack ||
      !track.audioTrack.mediaStream
    ) {
      return;
    }
    removeAudioStream(track.audioTrack.mediaStream.id);
    const userId = toPlugNmeetUserId(participant.identity);
    store.dispatch(removeOneSpeaker(userId));
  }
}
