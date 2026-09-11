import {
  ChatMessage,
  DataChannelMessage,
  DataMsgBodyType,
  InsightsTranscriptionResultSchema,
} from 'plugnmeet-protocol-js';

import ConnectNats from './ConnectNats';
import { store } from '../../store';
import { pollsApi } from '../../store/services/pollsApi';
import { updateParticipant } from '../../store/slices/participantSlice';
import { addExternalMediaPlayerEvent } from '../../store/slices/externalMediaPlayer';
import {
  addReaction,
  IReaction,
  REACTION_EMOJIS,
} from '../../store/slices/reactionsSlice';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';
import i18n from '../i18n';
import { getNotepadController } from '../../components/shared-notepad/NotepadController';
import { fromJsonString } from '@bufbuild/protobuf';
import { TextWithInfo } from '../../store/slices/interfaces/speechServices';
import { addSpeechSubtitleText } from '../../store/slices/speechServicesSlice';
import {
  addAllChatMessages,
  selectPublicChatMessages,
} from '../../store/slices/chatMessagesSlice';
import { PnmConnectionQuality } from '../livekit/ConnectionQualityMonitor';

const CHAT_SYNC_CHUNK_SIZE = 50;
// Hard cap on a single received sync chunk: a malicious/buggy peer could
// send a huge JSON blob, so refuse to JSON.parse anything unbounded.
const CHAT_SYNC_MAX_CHUNK_BYTES = 512 * 1024;

const getSentAtMs = (msg: ChatMessage): number => {
  const sentAt = Number(msg.sentAt);
  return Number.isFinite(sentAt) ? sentAt : 0;
};

const isSyncableChatMessage = (msg: unknown): msg is ChatMessage => {
  if (typeof msg !== 'object' || msg === null) {
    return false;
  }
  const m = msg as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    m.id !== '' &&
    typeof m.fromUserId === 'string' &&
    m.fromUserId !== '' &&
    typeof m.sentAt === 'string' &&
    typeof m.message === 'string' &&
    typeof m.isPrivate === 'boolean'
  );
};

export default class HandleDataMessage {
  private connectNats: ConnectNats;

  constructor(connectNats: ConnectNats) {
    this.connectNats = connectNats;
  }

  public handleMessage = async (payload: DataChannelMessage) => {
    switch (payload.type) {
      case DataMsgBodyType.REQ_PUBLIC_CHAT_DATA:
        if (payload.toUserId === this.connectNats.userId) {
          // only if was sent for me
          await this.handlePublicChatDataReq(payload.fromUserId);
        }
        break;
      case DataMsgBodyType.RES_PUBLIC_CHAT_DATA:
        if (payload.toUserId === this.connectNats.userId) {
          // only if was sent for me
          this.handlePublicChatDataRes(payload.message);
        }
        break;
      case DataMsgBodyType.USER_VISIBILITY_CHANGE:
        if (payload.fromUserId === this.connectNats.userId) {
          return;
        }
        this.handleUserVisibility(payload);
        break;
      case DataMsgBodyType.INFO:
        if (
          payload.fromUserId === this.connectNats.userId ||
          this.connectNats.isRecorder
        ) {
          return;
        }
        store.dispatch(
          addUserNotification({
            message: i18n.t(payload.message),
            typeOption: 'info',
          }),
        );
        break;
      case DataMsgBodyType.ALERT:
        if (
          payload.fromUserId === this.connectNats.userId ||
          this.connectNats.isRecorder
        ) {
          return;
        }
        store.dispatch(
          addUserNotification({
            message: i18n.t(payload.message),
            typeOption: 'warning',
          }),
        );
        break;
      case DataMsgBodyType.EXTERNAL_MEDIA_PLAYER_EVENTS:
        if (payload.fromUserId === this.connectNats.userId) {
          return;
        }
        this.handleExternalMediaPlayerEvents(payload.message);
        break;
      case DataMsgBodyType.REACTION:
        this.handleUserEmojiReaction(payload.message);
        break;
      case DataMsgBodyType.NEW_POLL_RESPONSE:
        if (payload.fromUserId === this.connectNats.userId) {
          return;
        }
        store.dispatch(
          pollsApi.util.invalidateTags([
            {
              type: 'Count',
              id: payload.message,
            },
            {
              type: 'Selected',
              id: payload.message,
            },
            {
              type: 'PollDetails',
              id: payload.message,
            },
          ]),
        );
        break;
      case DataMsgBodyType.USER_CONNECTION_QUALITY_CHANGE:
        store.dispatch(
          updateParticipant({
            id: payload.fromUserId,
            changes: {
              connectionQuality: payload.message as PnmConnectionQuality,
            },
          }),
        );
        break;
      case DataMsgBodyType.NOTEPAD_UPDATE:
      case DataMsgBodyType.NOTEPAD_AWARENESS:
      case DataMsgBodyType.NOTEPAD_SYNC_REQUEST:
      case DataMsgBodyType.NOTEPAD_SYNC_RESPONSE:
        getNotepadController().handleNotepadMessage(payload);
        break;
    }
  };

  private handleUserVisibility(payload: DataChannelMessage) {
    if (!this.connectNats.isAdmin) {
      return;
    }
    store.dispatch(
      updateParticipant({
        id: payload.fromUserId,
        changes: {
          visibility: payload.message,
        },
      }),
    );
  }

  private handleExternalMediaPlayerEvents(msg: string) {
    if (msg === '') {
      return;
    }
    const data = JSON.parse(msg);
    store.dispatch(addExternalMediaPlayerEvent(data));
  }

  public handleSpeechSubtitleText(message: string) {
    if (message === '') {
      return;
    }
    const lang = store.getState().speechServices.selectedSubtitleLang;
    const data = fromJsonString(InsightsTranscriptionResultSchema, message);

    if (lang !== '') {
      const d = new Date();
      const type = data.isPartial ? 'interim' : 'final';
      const result: TextWithInfo = {
        text: '',
        from: data.fromUserName,
        time: d.toLocaleTimeString(),
        id: d.getUTCMilliseconds().toString(),
      };
      if (data.lang === lang) {
        result.text = data.text;
      } else if (typeof data.translations[lang] !== 'undefined') {
        result.text = data.translations[lang];
      } else {
        return;
      }

      store.dispatch(
        addSpeechSubtitleText({
          type,
          result,
        }),
      );
    }
  }

  private async handlePublicChatDataReq(fromUserId: string) {
    // Stream all messages in small chunks so a single RES_PUBLIC_CHAT_DATA
    // blob can't exceed NATS ~1MB max payload. Chunks arrive in order; the
    // receiver dedupes by id via addAllChatMessages.
    const publicChats = selectPublicChatMessages(store.getState()).filter(
      (msg) => msg.fromUserId !== 'system',
    );
    if (!publicChats.length) {
      return;
    }

    const ordered = publicChats
      .slice()
      .sort((a, b) => getSentAtMs(a) - getSentAtMs(b));

    for (let i = 0; i < ordered.length; i += CHAT_SYNC_CHUNK_SIZE) {
      const chunk = ordered.slice(i, i + CHAT_SYNC_CHUNK_SIZE);
      await this.connectNats.sendDataMessage(
        DataMsgBodyType.RES_PUBLIC_CHAT_DATA,
        JSON.stringify(chunk),
        fromUserId,
      );
    }
  }

  private handlePublicChatDataRes(msg: string) {
    try {
      if (msg.length > CHAT_SYNC_MAX_CHUNK_BYTES) {
        console.warn('chat sync chunk too large, ignoring');
        return;
      }
      const parsed: unknown = JSON.parse(msg);
      if (!Array.isArray(parsed)) {
        return;
      }
      const data = parsed
        .filter(isSyncableChatMessage)
        .slice(0, CHAT_SYNC_CHUNK_SIZE);
      if (!data.length) {
        return;
      }
      store.dispatch(
        addAllChatMessages({
          messages: data,
          currentUserId: this.connectNats.userId,
        }),
      );
    } catch (e) {
      console.error(e);
    }
  }

  private handleUserEmojiReaction(msg: string) {
    try {
      const data: IReaction = JSON.parse(msg);
      if (!REACTION_EMOJIS.includes(data.emoji)) {
        return;
      }
      store.dispatch(addReaction(data));
    } catch (e) {
      console.error(e);
    }
  }
}
