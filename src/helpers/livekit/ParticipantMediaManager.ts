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
import { CurrentConnectionEvents, ISubscriberInfo } from './types';
import { activeSpeakersSelector } from '../../store/slices/activeSpeakersSlice';

export default class ParticipantMediaManager {
  private _audioSubscribersMap = new Map<string, ISubscriberInfo>();
  private _videoSubscribersMap = new Map<string, ISubscriberInfo>();
  private _screenShareTracksMap = new Map<string, Array<ISubscriberInfo>>();

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
    participant: Participant | LocalParticipant | RemoteParticipant,
    track: LocalTrackPublication | RemoteTrackPublication,
  ) => {
    const user = participantsSelector.selectById(
      store.getState(),
      participant.identity,
    );
    if (!user || !user.isOnline) {
      return;
    }

    const subscriberInfo: ISubscriberInfo = {
      user: user,
      track: track,
    };

    const tracks: Array<ISubscriberInfo> = [];
    if (this._screenShareTracksMap.has(user.userId)) {
      const oldTracks = this._screenShareTracksMap.get(user.userId);
      if (oldTracks && oldTracks.length) {
        tracks.push(...oldTracks);
      }
    }
    tracks.push(subscriberInfo);
    this._screenShareTracksMap.set(user.userId, tracks);
    this.syncScreenShareTracks(user.userId);
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
    const screenShareTracks = new Map(this._screenShareTracksMap);
    this.eventEmitter.emit(
      CurrentConnectionEvents.ScreenShareTracks,
      screenShareTracks,
    );
    store.dispatch(updateScreenSharing(payload));
  }

  public addAudioSubscriber = (
    participant: Participant | LocalParticipant | RemoteParticipant,
    track: LocalTrackPublication | RemoteTrackPublication,
  ) => {
    if (!participant.audioTrackPublications.size) {
      return;
    }
    const userId = toPlugNmeetUserId(participant.identity);
    const user = participantsSelector.selectById(store.getState(), userId);
    if (!user || !user.isOnline) {
      return;
    }
    // we don't want to add local audio here.
    if (userId === this.localUserId) {
      return;
    }

    const subscriberInfo: ISubscriberInfo = {
      user: user,
      track: track,
    };

    this._audioSubscribersMap.set(user.userId, subscriberInfo);
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
    track: LocalTrackPublication | RemoteTrackPublication,
  ) => {
    if (!participant.videoTrackPublications.size) {
      return;
    }
    const user = participantsSelector.selectById(
      store.getState(),
      participant.identity,
    );
    if (!user || !user.isOnline) {
      return;
    }

    const subscriberInfo: ISubscriberInfo = {
      user: user,
      track: track,
    };

    this._videoSubscribersMap.set(user.userId, subscriberInfo);
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
      const subscribers = new Map(this._videoSubscribersMap);
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
      const aUser = a[1].user;
      const bUser = b[1].user;

      const aSpeaker = speakerMap.get(aUser.userId);
      const bSpeaker = speakerMap.get(bUser.userId);

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

      return (aUser.joinedAt ?? 0) - (bUser.joinedAt ?? 0);
    });

    const subscribers = new Map(mediaSubscribersToArray);
    this.eventEmitter.emit(
      CurrentConnectionEvents.VideoSubscribers,
      subscribers,
    );
  }
}
