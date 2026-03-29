import {
  LocalParticipant,
  LocalTrackPublication,
  Participant,
  RemoteParticipant,
  RemoteTrackPublication,
} from 'livekit-client';
import { EventEmitter } from 'eventemitter3';

import { store } from '../../store';
import { participantsSelector } from '../../store/slices/participantSlice';
import {
  updateScreenSharing,
  updateTotalAudioSubscribers,
  updateTotalVideoSubscribers,
} from '../../store/slices/sessionSlice';
import { IScreenSharing } from '../../store/slices/interfaces/session';
import { toPlugNmeetUserId } from '../utils';
import { CurrentConnectionEvents } from './types';
import { activeSpeakersSelector } from '../../store/slices/activeSpeakersSlice';

export default class ParticipantMediaManager {
  private _audioSubscribersMap = new Map<string, RemoteParticipant>();
  private _videoSubscribersMap = new Map<
    string,
    Participant | LocalParticipant | RemoteParticipant
  >();
  private _screenShareTracksMap = new Map<
    string,
    Array<LocalTrackPublication | RemoteTrackPublication>
  >();

  private readonly localUserId: string;
  private eventEmitter: EventEmitter;

  constructor(eventEmitter: EventEmitter, localUserId: string) {
    this.eventEmitter = eventEmitter;
    this.localUserId = localUserId;
  }

  public get videoSubscribersMap() {
    return this._videoSubscribersMap;
  }

  public get audioSubscribersMap() {
    return this._audioSubscribersMap;
  }

  public get screenShareTracksMap() {
    return this._screenShareTracksMap;
  }

  public addScreenShareTrack = (
    userId: string,
    track: LocalTrackPublication | RemoteTrackPublication,
  ) => {
    const existUser = participantsSelector.selectById(store.getState(), userId);
    if (!existUser || !existUser.isOnline) {
      return;
    }

    const tracks: Array<LocalTrackPublication | RemoteTrackPublication> = [];
    if (this._screenShareTracksMap.has(userId)) {
      const oldTracks = this._screenShareTracksMap.get(userId);
      if (oldTracks && oldTracks.length) {
        tracks.push(...oldTracks);
      }
    }
    tracks.push(track);
    this._screenShareTracksMap.set(userId, tracks);
    this.syncScreenShareTracks(userId);
  };

  public removeScreenShareTrack = (userId: string) => {
    this._screenShareTracksMap.delete(userId);
    this.syncScreenShareTracks(userId);
  };

  private syncScreenShareTracks(userId: string) {
    let payload: IScreenSharing = {
      isActive: false,
      sharedBy: '',
    };

    // notify about status
    if (this._screenShareTracksMap.size) {
      payload = {
        isActive: true,
        sharedBy: userId,
      };
      this.eventEmitter.emit(CurrentConnectionEvents.ScreenShareStatus, true);
    } else {
      this.eventEmitter.emit(CurrentConnectionEvents.ScreenShareStatus, false);
    }

    // emit a new tracks map
    const screenShareTracks = new Map(this._screenShareTracksMap) as any;
    this.eventEmitter.emit(
      CurrentConnectionEvents.ScreenShareTracks,
      screenShareTracks,
    );
    store.dispatch(updateScreenSharing(payload));
  }

  public addAudioSubscriber = (
    participant: Participant | LocalParticipant | RemoteParticipant,
  ) => {
    if (!participant.audioTrackPublications.size) {
      return;
    }
    const userId = toPlugNmeetUserId(participant.identity);
    const existUser = participantsSelector.selectById(store.getState(), userId);
    if (!existUser || !existUser.isOnline) {
      return;
    }
    // we don't want to add local audio here.
    if (userId === this.localUserId) {
      return;
    }

    this._audioSubscribersMap.set(
      participant.identity,
      participant as RemoteParticipant,
    );
    this.syncAudioSubscribers();
  };

  public removeAudioSubscriber = (userId: string) => {
    if (!this._audioSubscribersMap.has(userId)) {
      return;
    }

    this._audioSubscribersMap.delete(userId);
    this.syncAudioSubscribers();
  };

  private syncAudioSubscribers() {
    const audioSubscribers = new Map(this._audioSubscribersMap);
    this.eventEmitter.emit(
      CurrentConnectionEvents.AudioSubscribers,
      audioSubscribers,
    );
    // update session reducer
    store.dispatch(updateTotalAudioSubscribers(audioSubscribers.size));
  }

  public addVideoSubscriber = (
    participant: Participant | LocalParticipant | RemoteParticipant,
  ) => {
    if (!participant.videoTrackPublications.size) {
      return;
    }
    const existUser = participantsSelector.selectById(
      store.getState(),
      participant.identity,
    );
    if (!existUser || !existUser.isOnline) {
      return;
    }

    this._videoSubscribersMap.set(participant.identity, participant);
    this.syncVideoSubscribers();
  };

  public removeVideoSubscriber = (userId: string) => {
    if (!this._videoSubscribersMap.has(userId)) {
      return;
    }

    this._videoSubscribersMap.delete(userId);
    this.syncVideoSubscribers();
  };

  private syncVideoSubscribers() {
    // update session reducer
    store.dispatch(updateTotalVideoSubscribers(this._videoSubscribersMap.size));

    if (this._videoSubscribersMap.size) {
      this.eventEmitter.emit(CurrentConnectionEvents.VideoStatus, true);
    } else {
      this.eventEmitter.emit(CurrentConnectionEvents.VideoStatus, false);
    }

    if (this._videoSubscribersMap.size <= 1) {
      const subscribers = new Map(this._videoSubscribersMap) as any;
      this.eventEmitter.emit(
        CurrentConnectionEvents.VideoSubscribers,
        subscribers,
      );
      return;
    }

    const activeSpeakers = activeSpeakersSelector.selectAll(store.getState());
    // Create a Map for O(1) lookups
    const speakerMap = new Map(activeSpeakers.map((s) => [s.userId, s]));

    const mediaSubscribersToArray = Array.from(this._videoSubscribersMap);
    mediaSubscribersToArray.sort((a, b) => {
      const aPrt = a[1];
      const bPart = b[1];

      const aSpeaker = speakerMap.get(aPrt.identity);
      const bSpeaker = speakerMap.get(bPart.identity);

      const aIsSpeaking = aSpeaker?.isSpeaking ?? false;
      const bIsSpeaking = bSpeaker?.isSpeaking ?? false;

      // speaker goes first
      if (aIsSpeaking !== bIsSpeaking) {
        return aIsSpeaking ? -1 : 1;
      }

      // last active speaker first
      const aLastSpoke = aSpeaker?.lastSpokeAt ?? 0;
      const bLastSpoke = bSpeaker?.lastSpokeAt ?? 0;
      if (aLastSpoke !== bLastSpoke) {
        return bLastSpoke - aLastSpoke;
      }

      // then LiveKit's last active speaker
      if (aPrt.lastSpokeAt !== bPart.lastSpokeAt) {
        const aLast = aPrt.lastSpokeAt?.getTime() ?? 0;
        const bLast = bPart.lastSpokeAt?.getTime() ?? 0;
        return bLast - aLast;
      }

      return (aPrt.joinedAt?.getTime() ?? 0) - (bPart.joinedAt?.getTime() ?? 0);
    });

    const subscribers = new Map(mediaSubscribersToArray) as any;
    this.eventEmitter.emit(
      CurrentConnectionEvents.VideoSubscribers,
      subscribers,
    );
  }
}
