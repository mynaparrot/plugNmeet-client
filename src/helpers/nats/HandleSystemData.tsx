import { create, fromJsonString } from '@bufbuild/protobuf';
import {
  ChatMessageSchema,
  InsightsAITextChatStreamResult,
  InsightsAITextChatStreamResultSchema,
  InsightsAIRequestSource,
  NatsMsgServerToClient,
  NatsMsgServerToClientEvents,
  NatsSystemNotificationSchema,
  NatsSystemNotificationTypes,
  RoomUploadedFileMetadataSchema,
} from 'plugnmeet-protocol-js';

import { store } from '../../store';
import {
  addUserNotification,
  updatePlayAudioNotification,
} from '../../store/slices/roomSettingsSlice';
import i18n from '../i18n';
import { pollsApi } from '../../store/services/pollsApi';
import { cleanHtmlForChat, getConfigValue, randomString } from '../utils';
import { updateAiTextChat } from '../../store/slices/insightsAiTextChatSlice';
import { handleNotepadAIStreamResult } from '../../components/shared-notepad/helpers/notepadAI';
import { handleWhiteboardAIStreamResult } from '../../components/whiteboard/ai/whiteboardAI';
import HandleChat from './HandleChat';
import { triggerRefreshWhiteboardFilesListSignal } from '../../store/slices/whiteboard';
import { breakoutRoomApi } from '../../store/services/breakoutRoomApi';
import { buildAccessTokenUrl } from '../../components/breakout-room/utils/breakoutRoom';

export default class HandleSystemData {
  private readonly _handleChat: HandleChat;
  private hasHandledUserMoved = false;

  constructor(handleChat: HandleChat) {
    this._handleChat = handleChat;
  }
  /**
   * To handle various notifications
   * @param data
   */
  public handleNotification = (data: string) => {
    const nt = fromJsonString(NatsSystemNotificationSchema, data);
    if (nt.msg === 'notifications.whiteboard-new-file-added') {
      store.dispatch(triggerRefreshWhiteboardFilesListSignal());
    }

    // The server may send the notification message as JSON: {"key": "<i18n key>", ...values}
    // so it can be translated with interpolation in the receiver's own locale.
    // Plain strings and bare i18n keys pass through as before.
    let message = nt.msg;
    try {
      const parsed = JSON.parse(nt.msg);
      if (parsed && typeof parsed.key === 'string') {
        const { key, ...values } = parsed;
        message = i18n.t(key, values).toString();
      } else {
        message = i18n.t(nt.msg);
      }
    } catch {
      message = i18n.t(nt.msg);
    }

    switch (nt.type) {
      case NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_INFO:
        store.dispatch(
          addUserNotification({
            message,
            typeOption: 'info',
            newInstance: true,
          }),
        );

        if (nt.withSound) {
          this.playNotification();
        }
        break;
      case NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_WARNING:
        store.dispatch(
          addUserNotification({
            message,
            typeOption: 'warning',
            newInstance: true,
          }),
        );
        if (nt.withSound) {
          this.playNotification();
        }
        break;
      case NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_ERROR:
        store.dispatch(
          addUserNotification({
            message,
            typeOption: 'error',
            newInstance: true,
          }),
        );
        if (nt.withSound) {
          this.playNotification();
        }
        break;
    }
  };

  public handlePoll = (payload: NatsMsgServerToClient) => {
    switch (payload.event) {
      case NatsMsgServerToClientEvents.POLL_CREATED:
        store.dispatch(
          addUserNotification({
            message: i18n.t('polls.new-poll'),
            typeOption: 'info',
            notificationCat: 'new-poll-created',
            autoClose: false,
          }),
        );
        store.dispatch(pollsApi.util.invalidateTags(['List', 'PollsStats']));
        break;
      case NatsMsgServerToClientEvents.POLL_CLOSED:
        store.dispatch(
          pollsApi.util.invalidateTags([
            'List',
            'PollsStats',
            {
              type: 'Count',
              id: payload.msg,
            },
            {
              type: 'Selected',
              id: payload.msg,
            },
            {
              type: 'PollResult',
              id: payload.msg,
            },
            {
              type: 'PollDetails',
              id: payload.msg,
            },
          ]),
        );
        break;
    }
  };

  public handleBreakoutRoom = (payload: NatsMsgServerToClient) => {
    switch (payload.event) {
      case NatsMsgServerToClientEvents.JOIN_BREAKOUT_ROOM:
        if (payload.msg !== '') {
          store.dispatch(
            addUserNotification({
              message: i18n.t('breakout-room.invitation-msg'),
              typeOption: 'info',
              notificationCat: 'breakout-room-invitation',
              autoClose: false,
            }),
          );
          store.dispatch(breakoutRoomApi.util.invalidateTags(['My_Rooms']));
        }
        break;
      case NatsMsgServerToClientEvents.BREAKOUT_ROOM_ENDED:
        store.dispatch(
          breakoutRoomApi.util.invalidateTags(['List', 'My_Rooms']),
        );
        break;
      case NatsMsgServerToClientEvents.BREAKOUT_ROOM_USER_MOVED: {
        if (payload.msg !== '') {
          try {
            const parsed = JSON.parse(payload.msg) as {
              token?: string;
              targetRoomId?: string;
              title?: string;
            };
            const token = parsed.token;
            // a duplicate event must not re-trigger.
            if (token && !this.hasHandledUserMoved) {
              this.hasHandledUserMoved = true;
              // An empty/missing targetRoomId means moving to the main room.
              const roomLabel = parsed.targetRoomId
                ? parsed.title
                : i18n.t('breakout-room.main-room');
              store.dispatch(
                addUserNotification({
                  message: i18n.t('breakout-room.user-moved', {
                    room: roomLabel,
                  }),
                  typeOption: 'info',
                  autoClose: false,
                }),
              );
              // Give the user a moment to read the notification before redirecting.
              setTimeout(() => {
                window.location.replace(buildAccessTokenUrl(token));
              }, 2000);
            }
          } catch {
            // malformed payload — ignore
          }
        }
        break;
      }
    }
  };

  public handleSysChatMsg = async (msg: string) => {
    const finalMsg = this.processIncomingChatMsg(msg);

    await this._handleChat.handleMsg(
      create(ChatMessageSchema, {
        id: randomString(),
        sentAt: Date.now().toString(),
        isPrivate: false,
        fromName: 'system',
        fromUserId: 'system',
        message: cleanHtmlForChat(finalMsg),
        fromAdmin: true, // system message always from admin
      }),
    );

    store.dispatch(
      addUserNotification({
        message: i18n.t('notifications.new-system-message-in-chat'),
        typeOption: 'info',
        newInstance: true,
      }),
    );
    this.playNotification();
  };

  private processIncomingChatMsg(input: string) {
    // First, check if it's even parseable as JSON
    try {
      JSON.parse(input);
    } catch {
      // If JSON.parse fails, it's definitely just plain text
      return input;
    }

    try {
      const payload = fromJsonString(RoomUploadedFileMetadataSchema, input, {
        ignoreUnknownFields: true,
      });
      if (payload.filePath !== '') {
        const rootUrl = getConfigValue<string>(
          'serverUrl',
          'http://localhost:8080',
        );
        const downloadLink =
          rootUrl +
          '/download/uploadedFile/' +
          window.encodeURIComponent(payload.filePath);
        const htmlLink = `<a href="${downloadLink}" target="_blank" class="text-[#24aef7] hover:underline">${payload.fileName}</a>`;

        return i18n.t('notifications.private-download-link-ready', {
          link: htmlLink,
        });
      }
    } catch {}

    return input;
  }

  public handleInsightsAITextData = (msg: string) => {
    const data = fromJsonString(
      InsightsAITextChatStreamResultSchema,
      msg,
    ) as InsightsAITextChatStreamResult;
    if (
      data.requestFrom ===
      InsightsAIRequestSource.INSIGHTS_AI_REQUEST_SOURCE_NOTEPAD
    ) {
      handleNotepadAIStreamResult(data);
      return;
    }
    if (
      data.requestFrom ===
      InsightsAIRequestSource.INSIGHTS_AI_REQUEST_SOURCE_WHITEBOARD
    ) {
      handleWhiteboardAIStreamResult(data);
      return;
    }
    store.dispatch(updateAiTextChat(data));
  };

  private playNotification() {
    store.dispatch(updatePlayAudioNotification(true));
  }
}
