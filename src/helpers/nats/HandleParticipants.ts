import { toast } from 'react-toastify';
import {
  ConnectionQuality,
  RemoteTrackPublication,
  Track,
} from 'livekit-client';
import {
  NatsKvUserInfo,
  NatsKvUserInfoSchema,
  NatsUserMetadataUpdateSchema,
  UserMetadataSchema,
} from 'plugnmeet-protocol-js';
import { create, fromJsonString } from '@bufbuild/protobuf';

import ConnectNats from './ConnectNats';
import {
  ICurrentUser,
  ICurrentUserMetadata,
} from '../../store/slices/interfaces/session';
import { store } from '../../store';
import {
  addCurrentUser,
  updateCurrentUserMetadata,
} from '../../store/slices/sessionSlice';
import {
  addParticipant,
  participantsSelector,
  removeParticipant,
  updateParticipant,
} from '../../store/slices/participantSlice';
import languages from '../languages';
import i18n from '../i18n';
import {
  updateIsActiveParticipantsPanel,
  updateIsActiveRaisehand,
} from '../../store/slices/bottomIconsActivitySlice';
import { updatePlayAudioNotification } from '../../store/slices/roomSettingsSlice';
import { removeOneSpeaker } from '../../store/slices/activeSpeakersSlice';
import { getCurrentConnection } from '../livekit/utils';

export default class HandleParticipants {
  private _that: ConnectNats;
  private _localParticipant: ICurrentUser;
  private preferredLang = '';
  private isRecorderJoin = false;
  private participantsCount = 0;
  private participantCounterInterval: any = 0;

  constructor(that: ConnectNats) {
    this._that = that;
    this._localParticipant = {
      userId: '',
      sid: '',
      name: '',
      isRecorder: false,
    };
  }

  get localParticipant(): ICurrentUser {
    return this._localParticipant;
  }

  private decodeMetadata(data: string): ICurrentUserMetadata {
    try {
      const metadata: ICurrentUserMetadata = fromJsonString(
        UserMetadataSchema,
        data,
      );
      return metadata;
    } catch (e) {}

    // default
    return create(UserMetadataSchema, {
      isAdmin: false,
      isPresenter: false,
      raisedHand: false,
      waitForApproval: false,
      lockSettings: {
        lockMicrophone: true,
        lockWebcam: true,
        lockScreenSharing: true,
        lockChat: true,
        lockChatSendMessage: true,
        lockChatFileShare: true,
        lockPrivateChat: true,
        lockWhiteboard: true,
        lockSharedNotepad: true,
      },
    });
  }

  public addLocalParticipantInfo = async (info: NatsKvUserInfo) => {
    this.isRecorderJoin = this.isRecorder(info.userId);
    this._localParticipant = {
      userId: info.userId,
      sid: info.userSid,
      name: info.name,
      isRecorder: this.isRecorderJoin,
    };
    if (this.isRecorderJoin) {
      this.recorderJoined();
    }

    store.dispatch(addCurrentUser(this._localParticipant));
    await this.updateParticipantMetadata(info.userId, info.metadata);
  };

  public addRemoteParticipant = async (p: string | NatsKvUserInfo) => {
    let participant: NatsKvUserInfo;
    if (typeof p === 'string') {
      try {
        participant = fromJsonString(NatsKvUserInfoSchema, p);
      } catch (e) {
        console.error(e);
        return;
      }
    } else {
      participant = p;
    }
    const metadata = this.decodeMetadata(participant.metadata);

    // check if this user exists or not
    const existUser = participantsSelector.selectById(
      store.getState(),
      participant.userId,
    );
    if (
      typeof existUser !== 'undefined' &&
      existUser.userId === participant.userId
    ) {
      console.info(
        `found same userId: ${existUser.userId} again, so updating medata only, metadata same?: ${metadata.metadataId === existUser.metadata.metadataId}`,
      );
      // we've the same user, so we won't add it again
      // because maybe this user disconnected & reconnected again
      // we can just try to update metadata
      if (metadata.metadataId !== existUser.metadata.metadataId) {
        await this.updateParticipantMetadata(
          participant.userId,
          participant.metadata,
        );
      }
      this.onAfterUserConnectMediaUpdate(participant.userId);
      return;
    }

    this.notificationForWaitingUser(metadata, participant.name);

    store.dispatch(
      addParticipant({
        sid: participant.userSid,
        userId: participant.userId,
        name: participant.name,
        metadata: metadata,
        isLocal: false,
        joinedAt: Number(participant.joinedAt),
        visibility: 'visible',
        audioVolume: store.getState().roomSettings.roomAudioVolume,
        audioTracks: 0,
        videoTracks: 0,
        screenShareTrack: 0,
        isMuted: false,
        connectionQuality: ConnectionQuality.Unknown,
        isOnline: true,
      }),
    );

    if (this.isRecorderJoin) {
      this.participantsCount++;
    }

    this.onAfterUserConnectMediaUpdate(participant.userId);
  };

  public handleParticipantMetadataUpdate = async (d: string) => {
    try {
      const data = fromJsonString(NatsUserMetadataUpdateSchema, d);
      await this.updateParticipantMetadata(data.userId, data.metadata);
    } catch (e) {
      console.error(e);
    }
  };

  public updateParticipantMetadata = async (userId: string, data: string) => {
    const metadata = this.decodeMetadata(data);
    store.dispatch(
      updateParticipant({
        id: userId,
        changes: {
          metadata,
        },
      }),
    );

    if (this._localParticipant.userId === userId) {
      if (
        this.preferredLang === '' &&
        typeof metadata.preferredLang !== 'undefined' &&
        metadata.preferredLang !== ''
      ) {
        this.preferredLang = metadata.preferredLang;
        for (let i = 0; i < languages.length; i++) {
          const lan = languages[i];
          if (lan.code.toLowerCase() === metadata.preferredLang.toLowerCase()) {
            // we'll only change if we've found the right language
            await i18n.changeLanguage(lan.code);
            break;
          }
        }
      }

      store.dispatch(updateCurrentUserMetadata(metadata));
      store.dispatch(updateIsActiveRaisehand(metadata.raisedHand));
    }
  };

  /**
   * when user disconnected temporary e.g. network related issue,
   * we'll mainly pause media files
   * @param data string
   */
  public handleParticipantDisconnected = (data: string) => {
    let participant: NatsKvUserInfo;
    try {
      participant = fromJsonString(NatsKvUserInfoSchema, data);
    } catch (e) {
      console.error(e);
      return;
    }

    const mediaConn = getCurrentConnection();
    // remove media for this user for the moment
    mediaConn.removeAudioSubscriber(participant.userId);
    mediaConn.removeVideoSubscriber(participant.userId);
    mediaConn.removeScreenShareTrack(participant.userId);

    store.dispatch(
      updateParticipant({
        id: participant.userId,
        changes: {
          isOnline: false,
        },
      }),
    );
  };

  /**
   * will use for both offline & logged out status
   * as both have similar task
   * we'll remove this use including all media files
   * @param data string
   */
  public handleParticipantOffline = (data: string) => {
    let p: NatsKvUserInfo;
    try {
      p = fromJsonString(NatsKvUserInfoSchema, data);
    } catch (e) {
      console.error(e);
      return;
    }
    if (this.isRecorderJoin) {
      this.participantsCount--;
    }

    console.log(p);

    // now remove user.
    store.dispatch(removeParticipant(p.userId));
    // remove if in active speaker
    store.dispatch(removeOneSpeaker(p.userId));
  };

  private notificationForWaitingUser(
    metadata: ICurrentUserMetadata,
    name: string,
  ) {
    const state = store.getState();
    if (state.session.currentUser?.isRecorder) {
      // if the current user is recorder then don't need to do anything
      return;
    }

    if (
      metadata.waitForApproval &&
      state.session.currentUser?.metadata?.isAdmin
    ) {
      // we can open the participants panel if close
      if (!state.bottomIconsActivity.isActiveParticipantsPanel) {
        store.dispatch(updateIsActiveParticipantsPanel(true));
      }
      // also play notification
      store.dispatch(updatePlayAudioNotification(true));

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

  public isRecorder = (userId: string) => {
    return userId === 'RECORDER_BOT' || userId === 'RTMP_BOT';
  };

  private recorderJoined() {
    this.startParticipantCounter();
    //store.dispatch(updateIsActiveChatPanel(false));
    store.dispatch(updateIsActiveParticipantsPanel(false));
  }

  public clearParticipantCounterInterval = () => {
    if (this.participantCounterInterval) {
      clearInterval(this.participantCounterInterval);
    }
  };

  /*
   * startParticipantCounter will only call if participant was a recorder or RTMP bot
   * */
  private startParticipantCounter() {
    this.participantCounterInterval = setInterval(async () => {
      if (this.participantsCount === 0) {
        console.log('NO_USER_ONLINE');
        await this._that.endSession('NO_USER_ONLINE');
      }
    }, 3000);
  }

  private onAfterUserConnectMediaUpdate(userId: string) {
    store.dispatch(
      updateParticipant({
        id: userId,
        changes: {
          isOnline: true,
        },
      }),
    );

    const mediaConn = getCurrentConnection();
    const participant = mediaConn.room.getParticipantByIdentity(userId);
    if (participant) {
      participant.trackPublications.forEach((track) => {
        if (
          track.source === Track.Source.ScreenShare ||
          track.source === Track.Source.ScreenShareAudio
        ) {
          mediaConn.addScreenShareTrack(
            participant.identity,
            track as RemoteTrackPublication,
          );
        } else {
          mediaConn.addVideoSubscriber(participant);
          mediaConn.addAudioSubscriber(participant);
        }
      });
    }
  }
}
