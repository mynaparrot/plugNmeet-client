import { RemoteTrackPublication, Track } from 'livekit-client';
import {
  NatsKvUserInfo,
  NatsKvUserInfoSchema,
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
  NatsUserMetadataUpdateSchema,
  UserMetadata,
  UserMetadataSchema,
  UserRaisedHandSchema,
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
  setActiveSidePanel,
  updateIsActiveRaisehand,
} from '../../store/slices/bottomIconsActivitySlice';
import {
  addUserNotification,
  updatePlayAudioNotification,
} from '../../store/slices/roomSettingsSlice';
import { removeOneSpeaker } from '../../store/slices/activeSpeakersSlice';
import { getMediaServerConn } from '../livekit/utils';
import { isUserRecorder, toLiveKitUserId } from '../utils';
import { PnmConnectionQuality } from '../livekit/ConnectionQualityMonitor';

const EMPTY_ROOM_CHECK_INTERVAL = 3000;
const USERS_RESYNC_MIN_INTERVAL = 60 * 1000;

export default class HandleParticipants {
  private connectNats: ConnectNats;
  private preferredLang = '';
  private participantCounterInterval: any = 0;

  private _localUserId: string | undefined;
  private _isLocalUserAdmin: boolean = false;
  private _isLocalUserRecorder = false;

  private activeUserTasks: Set<string> = new Set();
  private participantTaskChain: Promise<any> = Promise.resolve();
  private _lastUsersResyncReqAt = 0;

  constructor(connectNats: ConnectNats) {
    this.connectNats = connectNats;
  }

  /**
   * Serializes tasks that modify the participant list to prevent race conditions.
   * Each task is added to a promise chain and will only execute after the previous one is complete.
   * @param task The async function to execute.
   */
  private serialTask = (task: () => Promise<any>): Promise<any> => {
    this.participantTaskChain = this.participantTaskChain
      .then(task)
      .catch((err) => {
        console.error('A participant task failed:', err);
        // The chain continues even if one task fails.
      });
    return this.participantTaskChain;
  };

  /**
   * Wraps a primary task (join, leave) to mark a user as "busy".
   * This prevents the reconciliation task from making incorrect decisions based on stale data.
   * @param userId The user being processed.
   * @param task The async function to execute.
   */
  private _runPrimaryUserTask = async (
    userId: string,
    task: () => Promise<any>,
  ) => {
    this.activeUserTasks.add(userId);
    try {
      // We still use the serialTask chain to ensure primary tasks don't run over each other.
      await this.serialTask(task);
    } finally {
      // This ALWAYS runs, ensuring the user is never permanently locked.
      this.activeUserTasks.delete(userId);
    }
  };

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
      store.dispatch(setActiveSidePanel(null));
    }

    store.dispatch(addCurrentUser(localUser));
    await this.updateParticipantMetadata(info.userId, metadata);

    return localUser;
  };

  public addRemoteParticipant = (p: string | NatsKvUserInfo) => {
    let participant: NatsKvUserInfo;
    if (typeof p === 'string') {
      try {
        participant = fromJsonString(NatsKvUserInfoSchema, p);
      } catch (e) {
        console.error(e);
        return Promise.resolve();
      }
    } else {
      participant = p;
    }

    return this._runPrimaryUserTask(participant.userId, async () => {
      await this._addRemoteParticipant(participant);
    });
  };

  private async _addRemoteParticipant(
    participant: NatsKvUserInfo,
  ): Promise<boolean> {
    if (this._localUserId !== participant.userId) {
      if (isUserRecorder(participant.userId)) {
        return false;
      }
      const roomMetadata = store.getState().session?.currentRoom.metadata;
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
        connectionQuality: PnmConnectionQuality.Good,
        isOnline: true,
      }),
    );

    this.onAfterUserConnectMediaUpdate(participant.userId);
    return true;
  }

  public handleParticipantMetadataUpdate = (d: string) => {
    return this.serialTask(async () => {
      try {
        const data = fromJsonString(NatsUserMetadataUpdateSchema, d, {
          ignoreUnknownFields: true,
        });
        await this.updateParticipantMetadata(data.userId, data.metadata);
      } catch (e) {
        console.error(e);
      }
    });
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
      store.dispatch(updateIsActiveRaisehand(!!metadata.raisedHand?.isRaised));
    }
  };

  /**
   * Handles participant cleanup, either marking as disconnected or fully removing.
   * @param userId The userId of the participant to clean up.
   * @param isCompleteRemove If true, performs full removal (like offline); otherwise, marks as disconnected.
   */
  private _handleParticipantCleanup = (
    userId: string,
    isCompleteRemove: boolean,
  ) => {
    const mediaConn = getMediaServerConn();
    // Always remove media subscribers for this user
    mediaConn.removeAudioSubscriber(userId);
    mediaConn.removeVideoSubscriber(userId);
    mediaConn.removeScreenShareTrack(userId);

    if (isCompleteRemove) {
      // Full removal: remove from store and active speakers
      store.dispatch(removeParticipant(userId));
      store.dispatch(removeOneSpeaker(userId));
    } else {
      // Partial cleanup: mark as disconnected
      store.dispatch(
        updateParticipant({
          id: userId,
          changes: {
            isOnline: false,
          },
        }),
      );
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
      return Promise.resolve();
    }

    // ignore the echo of our own event
    if (participant.userId === this._localUserId) {
      return Promise.resolve();
    }

    return this._runPrimaryUserTask(participant.userId, async () => {
      this._handleParticipantCleanup(participant.userId, false);
    });
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
      return Promise.resolve();
    }
    return this._runPrimaryUserTask(p.userId, async () => {
      this._handleParticipantCleanup(p.userId, true);
    });
  };

  /**
   * Reconciles the local participant list against the server's online user ids.
   * Ghosts (local but not on server) are removed; missing users are repaired by
   * requesting the full chunked users list (rate limited).
   * Hidden users (recorder bots, internal ids like TTS agents) are never
   * ghost-removed — their cleanup is handled by USER_DISCONNECTED / USER_OFFLINE
   * events, which are broadcast to everyone.
   * @param msg A JSON string: {"ids":[...], "hiddenIds":[...]}.
   */
  public reconcileParticipants = (msg: string) => {
    return this.serialTask(async () => {
      try {
        const payload = JSON.parse(msg) as {
          ids: string[];
          hiddenIds: string[];
        };
        const serverIds = new Set(payload.ids);
        const protectedIds = new Set([...payload.ids, ...payload.hiddenIds]);
        const localIds = new Set(
          participantsSelector.selectIds(store.getState()),
        );

        // users online on the server but missing locally
        const missing: string[] = [];
        for (const id of serverIds) {
          if (isUserRecorder(id)) {
            continue;
          }
          if (this.activeUserTasks.has(id)) {
            console.log(
              `Reconciliation: Deferring check of ${id} because a primary task is active.`,
            );
            continue;
          }
          if (!localIds.has(id)) {
            missing.push(id);
          }
        }

        for (const id of localIds) {
          // never touch our own entry
          if (id === this._localUserId) {
            continue;
          }
          if (!protectedIds.has(id)) {
            if (this.activeUserTasks.has(id)) {
              console.log(
                `Reconciliation: Deferring removal of ${id} because a primary task is active.`,
              );
              continue;
            }
            console.log(`Reconciliation: Removing stale participant ${id}`);
            this._handleParticipantCleanup(id, true);
          }
        }

        if (missing.length > 0) {
          const now = Date.now();
          if (now - this._lastUsersResyncReqAt >= USERS_RESYNC_MIN_INTERVAL) {
            this._lastUsersResyncReqAt = now;
            console.log(
              `Reconciliation: ${missing.length} missing users, requesting users list resync`,
            );
            this.connectNats.sendMessageToSystemWorker(
              create(NatsMsgClientToServerSchema, {
                event: NatsMsgClientToServerEvents.REQ_JOINED_USERS_LIST,
              }),
            );
          }
        }
      } catch (e) {
        console.error('Failed to reconcile participants list:', e);
      }
    });
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
      raisedHand: create(UserRaisedHandSchema, {
        isRaised: false,
        raisedAt: '0',
      }),
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
      if (
        store.getState().bottomIconsActivity.activeSidePanel !== 'PARTICIPANTS'
      ) {
        store.dispatch(setActiveSidePanel('PARTICIPANTS'));
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

  public recorderJoined = () => {
    this.startParticipantCounter();
    store.dispatch(setActiveSidePanel(null));
  };

  /*
   * startParticipantCounter will only call if participant was a recorder or RTMP bot
   * */
  private startParticipantCounter() {
    this.participantCounterInterval = setInterval(async () => {
      const allParticipants = participantsSelector.selectIds(store.getState());
      const validUsers = allParticipants.filter(
        (userId) => !isUserRecorder(userId),
      );
      if (!validUsers.length) {
        console.log('NO_USER_ONLINE');
        await this.connectNats.endSession('NO_USER_ONLINE');
      }
    }, EMPTY_ROOM_CHECK_INTERVAL);
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
    if (!mediaConn.room) {
      return;
    }
    const participant = mediaConn.room.getParticipantByIdentity(
      toLiveKitUserId(userId),
    );
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
