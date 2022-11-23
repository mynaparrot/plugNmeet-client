import { Dispatch } from 'react';
import { isEmpty } from 'validator';
import {
  DisconnectReason,
  LocalParticipant,
  LocalTrackPublication,
  Participant,
  RemoteParticipant,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
} from 'livekit-client';
import { EventEmitter } from 'events';

import { store } from '../../store';
import { updateParticipant } from '../../store/slices/participantSlice';
import {
  addCurrentRoom,
  addCurrentUser,
  updateScreenSharing,
  updateTotalAudioSubscribers,
  updateTotalVideoSubscribers,
} from '../../store/slices/sessionSlice';

import HandleParticipants from './HandleParticipants';
import HandleMediaTracks from './HandleMediaTracks';
import HandleDataMessages from './HandleDataMessages';
import HandleRoomMetadata from './HandleRoomMetadata';
import { IErrorPageProps } from '../../components/extra-pages/Error';
import {
  closeWebsocketConnection,
  openWebsocketConnection,
  sendWebsocketMessage,
} from '../websocket';
import HandleActiveSpeakers from './HandleActiveSpeakers';
import { LivekitInfo } from './hooks/useLivekitConnect';
import i18n from '../i18n';
import {
  DataMessage,
  DataMsgBodyType,
  DataMsgType,
} from '../proto/plugnmeet_datamessage_pb';
import {
  ConnectionStatus,
  CurrentConnectionEvents,
  IConnectLivekit,
} from './types';

const RENEW_TOKEN_FREQUENT = 3 * 60 * 1000;

export default class ConnectLivekit
  extends EventEmitter
  implements IConnectLivekit
{
  private _audioSubscribersMap = new Map<string, RemoteParticipant>();
  private _videoSubscribersMap = new Map<
    string,
    Participant | LocalParticipant | RemoteParticipant
  >();
  private _screenShareTracksMap = new Map<
    string,
    LocalTrackPublication | RemoteTrackPublication
  >();

  private errorState: Dispatch<IErrorPageProps>;
  private roomConnectionStatusState: Dispatch<ConnectionStatus>;

  protected token: string;
  public _room: Room;
  private url: string;
  private tokenRenewInterval: any;

  private handleParticipant: HandleParticipants;
  private handleMediaTracks: HandleMediaTracks;
  private handleDataMessages: HandleDataMessages;
  private handleRoomMetadata: HandleRoomMetadata;
  private handleActiveSpeakers: HandleActiveSpeakers;

  constructor(
    livekitInfo: LivekitInfo,
    errorState: Dispatch<IErrorPageProps>,
    roomConnectionStatusState: Dispatch<ConnectionStatus>,
  ) {
    super();
    this.token = livekitInfo.token;
    this.url = livekitInfo.livekit_host;

    this.errorState = errorState;
    this.roomConnectionStatusState = roomConnectionStatusState;

    this.handleParticipant = new HandleParticipants(this);
    this.handleMediaTracks = new HandleMediaTracks(this);
    this.handleDataMessages = new HandleDataMessages(this);
    this.handleRoomMetadata = new HandleRoomMetadata();
    this.handleActiveSpeakers = new HandleActiveSpeakers(this);

    this.roomConnectionStatusState('connecting');
    // clean session data
    sessionStorage.clear();
    // configure room
    this._room = this.configureRoom();
    // finally connect
    this.connect();
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

  public get room() {
    return this._room;
  }

  private connect = async () => {
    try {
      await this._room.connect(this.url, this.token);
      // we'll prepare our information
      await this.initiateParticipants();
      await this.updateSession();
      // open websocket
      openWebsocketConnection();
      // finally
      this.roomConnectionStatusState('connected');
      // start token renew interval
      this.startTokenRenewInterval();
    } catch (error) {
      console.error(error);
      this.roomConnectionStatusState('error');
      this.errorState({
        title: 'Error',
        text: String(error),
      });
    }
  };

  private initiateParticipants = async () => {
    // check if current user is recorder/rtmp bot
    const isRecorder =
      (this._room.localParticipant.identity === 'RECORDER_BOT' ||
        this._room.localParticipant.identity === 'RTMP_BOT') ??
      false;

    // local Participant
    store.dispatch(
      addCurrentUser({
        sid: this._room.localParticipant.sid,
        userId: this._room.localParticipant.identity,
        name: this._room.localParticipant.name,
        isRecorder,
      }),
    );
    this.handleParticipant.setParticipantMetadata(
      '',
      this._room.localParticipant,
    );

    // start recorder task
    if (isRecorder) {
      this.handleParticipant.recorderJoined();
    } else {
      // otherwise we'll added user
      this.handleParticipant.addParticipant(this._room.localParticipant);
    }

    // all other connected Participants
    this._room.participants.forEach((participant) => {
      this.handleParticipant.addParticipant(participant);

      participant.getTracks().forEach((track) => {
        if (track.isSubscribed) {
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
            this.setScreenShareTrack(
              track as RemoteTrackPublication,
              participant,
            );
          } else {
            this.updateVideoSubscribers(participant);
          }
        }
      });
    });

    return;
  };

  private updateSession = async () => {
    store.dispatch(
      addCurrentRoom({
        sid: this._room.sid,
        room_id: this._room.name,
      }),
    );

    if (this._room.metadata && !isEmpty(this._room.metadata)) {
      this.handleRoomMetadata.setRoomMetadata(this._room.metadata);
    }

    return;
  };

  private configureRoom = () => {
    const room = new Room({
      adaptiveStream: true,
      dynacast: (window as any).ENABLE_DYNACAST ?? false,
      stopLocalTrackOnUnpublish: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
      publishDefaults: {
        simulcast: (window as any).ENABLE_SIMULCAST ?? false,
        videoSimulcastLayers: [
          VideoPresets.h90,
          VideoPresets.h180,
          VideoPresets.h360,
        ],
        stopMicTrackOnMute: (window as any).STOP_MIC_TRACK_ON_MUTE ?? false,
        videoCodec: (window as any).VIDEO_CODEC ?? 'vp8',
      },
    });

    room.on(RoomEvent.Reconnecting, () =>
      this.roomConnectionStatusState('re-connecting'),
    );
    room.on(RoomEvent.Reconnected, () =>
      this.roomConnectionStatusState('connected'),
    );
    room.on(RoomEvent.Disconnected, this.onDisconnected);
    room.on(
      RoomEvent.RoomMetadataChanged,
      this.handleRoomMetadata.setRoomMetadata,
    );
    room.on(
      RoomEvent.ActiveSpeakersChanged,
      this.handleActiveSpeakers.activeSpeakersChanged,
    );
    room.on(RoomEvent.MediaDevicesError, this.mediaDevicesError);

    room.on(RoomEvent.DataReceived, this.handleDataMessages.dataReceived);

    room.on(
      RoomEvent.ParticipantConnected,
      this.handleParticipant.participantConnected,
    );
    room.on(
      RoomEvent.ParticipantDisconnected,
      this.handleParticipant.participantDisconnected,
    );
    room.on(
      RoomEvent.ParticipantMetadataChanged,
      this.handleParticipant.setParticipantMetadata,
    );
    room.on(
      RoomEvent.ConnectionQualityChanged,
      this.handleParticipant.connectionQualityChanged,
    );

    room.on(
      RoomEvent.LocalTrackPublished,
      this.handleMediaTracks.localTrackPublished,
    );
    room.on(
      RoomEvent.LocalTrackUnpublished,
      this.handleMediaTracks.localTrackUnpublished,
    );
    room.on(RoomEvent.TrackSubscribed, this.handleMediaTracks.trackSubscribed);
    room.on(
      RoomEvent.TrackUnpublished,
      this.handleMediaTracks.trackUnsubscribed,
    );
    room.on(
      RoomEvent.TrackSubscriptionFailed,
      this.handleMediaTracks.trackSubscriptionFailed,
    );
    room.on(RoomEvent.TrackMuted, this.handleMediaTracks.trackMuted);
    room.on(RoomEvent.TrackUnmuted, this.handleMediaTracks.trackUnmuted);
    room.on(
      RoomEvent.TrackStreamStateChanged,
      this.handleMediaTracks.trackStreamStateChanged,
    );

    return room;
  };

  private onDisconnected = (reason?: DisconnectReason) => {
    this.errorState({
      title: i18n.t('notifications.room-disconnected-title'),
      text: this.getDisconnectErrorReasonText(reason),
    });
    this.roomConnectionStatusState('disconnected');
    closeWebsocketConnection();
    this.handleActiveSpeakers.onLivekitDisconnect();
    clearInterval(this.tokenRenewInterval);
    this.handleParticipant.clearParticipantCounterInterval();

    // redirect to logout url
    const logout_url =
      store.getState().session.currentRoom.metadata?.logout_url;
    if (reason === DisconnectReason.ROOM_DELETED && logout_url) {
      setTimeout(() => {
        window.location.href = logout_url;
      }, 5000);
    }
  };

  private getDisconnectErrorReasonText = (reason?: DisconnectReason) => {
    let msg = i18n.t('notifications.room-disconnected-unknown', {
      code: 'UNKNOWN_REASON',
    });

    switch (reason) {
      case DisconnectReason.CLIENT_INITIATED:
        msg = i18n.t('notifications.room-disconnected-client-initiated', {
          code: 'CLIENT_INITIATED',
        });
        break;
      case DisconnectReason.DUPLICATE_IDENTITY:
        msg = i18n.t('notifications.room-disconnected-duplicate-entry', {
          code: 'DUPLICATE_IDENTITY',
        });
        break;
      case DisconnectReason.SERVER_SHUTDOWN:
        msg = i18n.t('notifications.room-disconnected-server-shutdown', {
          code: 'SERVER_SHUTDOWN',
        });
        break;
      case DisconnectReason.PARTICIPANT_REMOVED:
        msg = i18n.t('notifications.room-disconnected-participant-removed', {
          code: 'PARTICIPANT_REMOVED',
        });
        break;
      case DisconnectReason.ROOM_DELETED:
        msg = i18n.t('notifications.room-disconnected-room-ended', {
          code: 'ROOM_ENDED',
        });
        break;
      case DisconnectReason.STATE_MISMATCH:
        msg = i18n.t('notifications.room-disconnected-state-mismatch', {
          code: 'STATE_MISMATCH',
        });
        break;
    }

    return msg;
  };

  private mediaDevicesError = (error: Error) => {
    // to do
    console.error(error);
  };

  // this method basically update plugNmeet token
  // livekit will renew token by itself automatically
  private startTokenRenewInterval = () => {
    this.tokenRenewInterval = setInterval(() => {
      // get current token that is store in redux
      const token = store.getState().session.token;
      const dataMsg = new DataMessage({
        type: DataMsgType.SYSTEM,
        roomSid: this._room.sid,
        roomId: this._room.name,
        body: {
          type: DataMsgBodyType.RENEW_TOKEN,
          from: {
            sid: this._room.localParticipant.sid,
            userId: this._room.localParticipant.identity,
          },
          isPrivate: 1,
          msg: token,
        },
      });

      sendWebsocketMessage(dataMsg.toBinary());
    }, RENEW_TOKEN_FREQUENT);
  };

  /**
   * This method will set screenshare media track
   * @param track: LocalTrackPublication | RemoteTrackPublication
   * @param participant: LocalParticipant | RemoteParticipant
   * @param add: boolean
   */
  public setScreenShareTrack = (
    track: LocalTrackPublication | RemoteTrackPublication,
    participant: LocalParticipant | RemoteParticipant,
    add = true,
  ) => {
    if (add) {
      this._screenShareTracksMap.set(participant.identity, track);
    } else {
      this._screenShareTracksMap.delete(participant.identity);
    }

    // notify about status
    if (this._screenShareTracksMap.size) {
      this.emit(CurrentConnectionEvents.ScreenShareStatus, true);
    } else {
      this.emit(CurrentConnectionEvents.ScreenShareStatus, false);
    }

    // emit new tracks map
    const screenShareTracks = new Map(this._screenShareTracksMap) as any;
    this.emit(CurrentConnectionEvents.ScreenShareTracks, screenShareTracks);
  };

  /**
   * This method will update screen sharing if user disconnect
   * This will ensure UI has been updated properly
   * @param participant: LocalParticipant | RemoteParticipant
   */
  public updateScreenShareOnUserDisconnect = (
    participant: RemoteParticipant,
  ) => {
    if (this._screenShareTracksMap.size) {
      if (this._screenShareTracksMap.has(participant.identity)) {
        this._screenShareTracksMap.delete(participant.identity);

        const screenShareTracks = new Map(this._screenShareTracksMap) as any;
        this.emit(CurrentConnectionEvents.ScreenShareTracks, screenShareTracks);

        // update status too
        if (!this._screenShareTracksMap.size) {
          store.dispatch(
            updateScreenSharing({
              isActive: false,
              sharedBy: '',
            }),
          );
          this.emit(CurrentConnectionEvents.ScreenShareStatus, false);
        } else {
          this.emit(CurrentConnectionEvents.ScreenShareStatus, true);
        }
      }
    }
  };

  /**
   * This method will add/update audio subscribers
   * @param participant: Participant | LocalParticipant | RemoteParticipant
   * @param add: boolean
   */
  public updateAudioSubscribers = (
    participant: Participant | LocalParticipant | RemoteParticipant,
    add = true,
  ) => {
    if (typeof participant.identity === 'undefined') {
      return;
    }

    // we don't want to add local audio here.
    if (participant.identity === this._room.localParticipant.identity) {
      return;
    }

    if (add) {
      this._audioSubscribersMap.set(
        participant.identity,
        participant as RemoteParticipant,
      );
    } else {
      if (this._audioSubscribersMap.has(participant.identity)) {
        this._audioSubscribersMap.delete(participant.identity);
      }
    }
    const audioSubscribers = new Map(this._audioSubscribersMap) as any;
    this.emit(CurrentConnectionEvents.AudioSubscribers, audioSubscribers);
    // update session reducer
    store.dispatch(updateTotalAudioSubscribers(audioSubscribers.size));
  };

  /**
   * This method will add/update webcams
   * This will also sort webcam lists based on active speaker event
   * @param participant: Participant | LocalParticipant | RemoteParticipant
   * @param add: boolean
   */
  public updateVideoSubscribers = (
    participant: Participant | LocalParticipant | RemoteParticipant,
    add = true,
  ) => {
    if (typeof participant.identity === 'undefined') {
      return;
    }

    if (add) {
      this._videoSubscribersMap.set(participant.identity, participant);
    } else {
      if (this._videoSubscribersMap.has(participant.identity)) {
        this._videoSubscribersMap.delete(participant.identity);
      }
    }

    // update session reducer
    store.dispatch(updateTotalVideoSubscribers(this._videoSubscribersMap.size));
    if (this._videoSubscribersMap.size) {
      this.emit(CurrentConnectionEvents.VideoStatus, true);
    } else {
      this.emit(CurrentConnectionEvents.VideoStatus, false);
    }

    if (this._videoSubscribersMap.size <= 1) {
      const subscribers = new Map(this._videoSubscribersMap) as any;
      this.emit(CurrentConnectionEvents.VideoSubscribers, subscribers);
      return;
    }

    const mediaSubscribersToArray = Array.from(this._videoSubscribersMap);
    mediaSubscribersToArray.sort((a, b) => {
      const aPrt = a[1];
      const bPart = b[1];

      if (aPrt.isSpeaking && bPart.isSpeaking) {
        return bPart.audioLevel - aPrt.audioLevel;
      }
      // speaker goes first
      if (aPrt.isSpeaking !== bPart.isSpeaking) {
        if (aPrt.isSpeaking) {
          return -1;
        } else {
          return 1;
        }
      }

      // last active speaker first
      if (aPrt.lastSpokeAt !== bPart.lastSpokeAt) {
        const aLast = aPrt.lastSpokeAt?.getTime() ?? 0;
        const bLast = bPart.lastSpokeAt?.getTime() ?? 0;
        return bLast - aLast;
      }

      return (aPrt.joinedAt?.getTime() ?? 0) - (bPart.joinedAt?.getTime() ?? 0);
    });

    const subscribers = new Map(mediaSubscribersToArray) as any;
    this.emit(CurrentConnectionEvents.VideoSubscribers, subscribers);
  };
}
