import { ChatMessage } from 'plugnmeet-protocol-js';

import ConnectNats from './ConnectNats';
import { store } from '../../store';
import { addChatMessage } from '../../store/slices/chatMessagesSlice';
import {
  updateIsActiveChatPanel,
  updateTotalUnreadChatMsgs,
} from '../../store/slices/bottomIconsActivitySlice';
import { updateUnreadMsgFrom } from '../../store/slices/roomSettingsSlice';
import { DB_STORE_NAMES, idbStore } from '../libs/idb';

export default class HandleChat {
  private connectNats: ConnectNats;
  private allowViewOtherUsersList: boolean | undefined = undefined;

  constructor(connectNats: ConnectNats) {
    this.connectNats = connectNats;
  }

  public handleMsg = async (payload: ChatMessage) => {
    // If this is a private message, we should only process it if we are the sender or the receiver.
    if (
      payload.isPrivate &&
      payload.fromUserId !== this.connectNats.userId &&
      payload.toUserId !== this.connectNats.userId
    ) {
      // This is a private message between two other users, so we can ignore it.
      return;
    }

    if (typeof this.allowViewOtherUsersList === 'undefined') {
      this.allowViewOtherUsersList =
        store.getState().session.currentRoom.metadata?.roomFeatures?.allowViewOtherUsersList;
    }

    if (
      !this.allowViewOtherUsersList &&
      !payload.fromAdmin &&
      !this.connectNats.isAdmin &&
      payload.fromUserId !== this.connectNats.userId
    ) {
      // as it'd not allow viewing other users in the list
      // so, any chat message will not be added except from admin
      return;
    }

    // check translation
    const selectedChatTransLang =
      store.getState().roomSettings.selectedChatTransLang;
    if (selectedChatTransLang !== '') {
      if (payload.sourceLang && payload.sourceLang !== selectedChatTransLang) {
        // so, we'll need to pickup from translation
        if (
          typeof payload.translations[selectedChatTransLang] !== 'undefined'
        ) {
          payload.message = payload.translations[selectedChatTransLang];
        }
      }
    }

    store.dispatch(
      addChatMessage({
        message: payload,
        currentUserId: this.connectNats.userId,
      }),
    );
    await idbStore(DB_STORE_NAMES.CHAT_MESSAGES, payload.id, payload);

    const isActiveChatPanel =
      store.getState().bottomIconsActivity.isActiveChatPanel;
    const selectedChatOption = store.getState().roomSettings.selectedChatOption;
    const currentUser = store.getState().session.currentUser;
    const isRecorder =
      (currentUser?.userId === 'RECORDER_BOT' ||
        currentUser?.userId === 'RTMP_BOT') ??
      false;

    if (!isActiveChatPanel) {
      if (!isRecorder) {
        store.dispatch(updateTotalUnreadChatMsgs());
      } else {
        store.dispatch(updateIsActiveChatPanel(true));
      }
    }

    if (!payload.isPrivate && selectedChatOption !== 'public') {
      store.dispatch(
        updateUnreadMsgFrom({
          task: 'ADD',
          id: 'public',
        }),
      );
    } else if (
      payload.isPrivate &&
      selectedChatOption !== payload.fromUserId &&
      payload.fromUserId !== currentUser?.userId
    ) {
      store.dispatch(
        updateUnreadMsgFrom({
          task: 'ADD',
          id: payload.fromUserId,
        }),
      );
    }
  };
}
