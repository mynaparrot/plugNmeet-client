import {
  ConnectionQuality,
  RemoteTrackPublication,
  Track,
} from 'livekit-client';
import {
  NatsKvUserInfo,
  NatsKvUserInfoSchema,
  NatsUserMetadataUpdateSchema,
  UserMetadata,
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
import { languagesMap } from '../languages';
import i18n from '../i18n';
import {
  updateIsActiveParticipantsPanel,
  updateIsActiveRaisehand,
} from '../../store/slices/bottomIconsActivitySlice';
import {
  addUserNotification,
  updatePlayAudioNotification,
} from '../../store/slices/roomSettingsSlice';
import { removeOneSpeaker } from '../../store/slices/activeSpeakersSlice';
import { getMediaServerConn } from '../livekit/utils';
import { isUserRecorder } from '../utils';

export default class HandleParticipants {
  private _that: ConnectNats;
  private preferredLang = '';
  private participantsCount = 0;
  private participantCounterInterval: any = 0;

  private _localUserId: string | undefined;
  private _isLocalUserAdmin: boolean = false;
  private _isLocalUserRecorder = false;

  constructor(that: ConnectNats) {
    this._that = that;
  }

  public addLocalParticipantInfo = async (
    info: NatsKvUserInfo,
  ): Promise<ICurrentUser> => {
    this._isLocalUserRecorder = isUserRecorder(info.userId);

    const metadata = this.decodeMetadata(info.metadata);
    const localUser = {
      userId: info.userId,
      sid: info.userSid,
      name: info.name,
      isRecorder: this._isLocalUserRecorder,
      metadata,
    };
    this._localUserId = info.userId;
    this._isLocalUserAdmin = info.isAdmin;

    if (this._isLocalUserRecorder) {
      this.recorderJoined();
    }

    store.dispatch(addCurrentUser(localUser));
    await this.updateParticipantMetadata(info.userId, metadata);

    return localUser;
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

    const added = await this._addRemoteParticipant(participant);
    if (added && this._isLocalUserRecorder) {
      this.participantsCount++;
    }
  };

  private async _addRemoteParticipant(
    participant: NatsKvUserInfo,
  ): Promise<boolean> {
    if (this._localUserId !== participant.userId) {
      if (isUserRecorder(participant.userId)) {
        return false;
      }
      const roomMetadata = store.getState().session.currentRoom.metadata;
      if (
        !participant.isAdmin &&
        !this._isLocalUserAdmin &&
        !roomMetadata?.roomFeatures?.allowViewOtherUsersList
      ) {
        return false;
      }
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
      return false;
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

    this.onAfterUserConnectMediaUpdate(participant.userId);
    return true;
  }

  public handleParticipantMetadataUpdate = async (d: string) => {
    try {
      const data = fromJsonString(NatsUserMetadataUpdateSchema, d);
      await this.updateParticipantMetadata(data.userId, data.metadata);
    } catch (e) {
      console.error(e);
    }
  };

  public updateParticipantMetadata = async (
    userId: string,
    metadata: string | UserMetadata,
  ) => {
    if (typeof metadata === 'string') {
      metadata = this.decodeMetadata(metadata);
    }

    store.dispatch(
      updateParticipant({
        id: userId,
        changes: {
          metadata,
        },
      }),
    );

    if (this._localUserId === userId) {
      if (
        this.preferredLang === '' &&
        typeof metadata.preferredLang !== 'undefined' &&
        metadata.preferredLang !== ''
      ) {
        this.preferredLang = metadata.preferredLang;
        const lang = languagesMap.get(metadata.preferredLang.toLowerCase());
        if (lang) {
          await i18n.changeLanguage(lang.code);
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

    const mediaConn = getMediaServerConn();
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
    if (this._isLocalUserRecorder) {
      this.participantsCount--;
    }

    // now remove user.
    store.dispatch(removeParticipant(p.userId));
    // remove if in active speaker
    store.dispatch(removeOneSpeaker(p.userId));
  };

  public clearParticipantCounterInterval = () => {
    if (this.participantCounterInterval) {
      clearInterval(this.participantCounterInterval);
    }
  };

  private decodeMetadata(data: string): ICurrentUserMetadata {
    try {
      return fromJsonString(UserMetadataSchema, data);
    } catch (e) {
      console.error(e);
    }

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

  private notificationForWaitingUser(
    metadata: ICurrentUserMetadata,
    name: string,
  ) {
    if (this._isLocalUserRecorder) {
      // if the current user is recorder then don't need to do anything
      return;
    }

    if (metadata.waitForApproval && this._isLocalUserAdmin) {
      // we can open the participants panel if close
      if (!store.getState().bottomIconsActivity.isActiveParticipantsPanel) {
        store.dispatch(updateIsActiveParticipantsPanel(true));
      }
      // also play notification
      store.dispatch(updatePlayAudioNotification(true));
      store.dispatch(
        addUserNotification({
          message: i18n.t('waiting-room.user-waiting', {
            name: name,
          }),
          typeOption: 'info',
        }),
      );
    }
  }

  private recorderJoined() {
    this.startParticipantCounter();
    //store.dispatch(updateIsActiveChatPanel(false));
    store.dispatch(updateIsActiveParticipantsPanel(false));
  }

  /*
   * startParticipantCounter will only call if participant was a recorder or RTMP bot
   * */
  private startParticipantCounter() {
    this.participantCounterInterval = setInterval(async () => {
      if (this.participantsCount <= 1) {
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

    const mediaConn = getMediaServerConn();
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
