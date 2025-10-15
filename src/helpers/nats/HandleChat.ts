import { ChatMessage } from 'plugnmeet-protocol-js';

import ConnectNats from './ConnectNats';
import { store } from '../../store';
import { decryptMessage } from '../libs/cryptoMessages';
import { addChatMessage } from '../../store/slices/chatMessagesSlice';
import {
  updateIsActiveChatPanel,
  updateTotalUnreadChatMsgs,
} from '../../store/slices/bottomIconsActivitySlice';
import {
  addUserNotification,
  updateUnreadMsgFrom,
} from '../../store/slices/roomSettingsSlice';
import { DB_STORE_CHAT_MESSAGES, idbStore } from '../libs/idb';

export default class HandleChat {
  private _that: ConnectNats;
  private _isEnabledE2EE: boolean | undefined = undefined;
  private allowViewOtherUsersList: boolean | undefined = undefined;

  constructor(that: ConnectNats) {
    this._that = that;
  }

  public handleMsg = async (payload: ChatMessage) => {
    // If this is a private message, we should only process it if we are the sender or the receiver.
    if (
      payload.isPrivate &&
      payload.fromUserId !== this._that.userId &&
      payload.toUserId !== this._that.userId
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
      !this._that.isAdmin &&
      payload.fromUserId !== this._that.userId
    ) {
      // as it'd not allow viewing other users in the list
      // so, any chat message will not be added except from admin
      return;
    }

    const finalMsg = await this.handleDecryption(payload.message);
    if (!finalMsg) {
      return;
    }
    payload.message = finalMsg;
    store.dispatch(
      addChatMessage({ message: payload, currentUserId: this._that.userId }),
    );
    await idbStore(DB_STORE_CHAT_MESSAGES, payload.id, payload);

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

  private async handleDecryption(msg: string) {
    if (typeof this._isEnabledE2EE === 'undefined') {
      const e2ee =
        store.getState().session.currentRoom.metadata?.roomFeatures
          ?.endToEndEncryptionFeatures;
      this._isEnabledE2EE = !!(
        e2ee &&
        e2ee.isEnabled &&
        e2ee.includedChatMessages
      );
    }
    if (this._isEnabledE2EE) {
      try {
        return await decryptMessage(msg);
      } catch (e: any) {
        store.dispatch(
          addUserNotification({
            message: 'Decryption error: ' + e.message,
            typeOption: 'error',
          }),
        );
        console.error('Decryption error:' + e.message);
        return undefined;
      }
    }
    return msg;
  }
}
