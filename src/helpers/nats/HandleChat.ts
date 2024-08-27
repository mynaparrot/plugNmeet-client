import { ChatMessage, EndToEndEncryptionFeatures } from 'plugnmeet-protocol-js';
import { toast } from 'react-toastify';

import ConnectNats from './ConnectNats';
import { store } from '../../store';
import { decryptMessage } from '../cryptoMessages';
import { addChatMessage } from '../../store/slices/chatMessagesSlice';
import {
  updateIsActiveChatPanel,
  updateTotalUnreadChatMsgs,
} from '../../store/slices/bottomIconsActivitySlice';
import { updateUnreadMsgFrom } from '../../store/slices/roomSettingsSlice';

export default class HandleChat {
  private _that: ConnectNats;
  private checkedE2EE = false;
  private _e2eeFeatures: EndToEndEncryptionFeatures | undefined = undefined;

  constructor(that: ConnectNats) {
    this._that = that;
  }

  public handleMsg = async (payload: ChatMessage) => {
    if (payload.isPrivate && payload.toUserId !== this._that.userId) {
      if (payload.fromUserId !== this._that.userId) {
        // private message not for this user
        return;
      }
    }

    const finalMsg = await this.handleDecryption(payload.message);
    if (!finalMsg) {
      return;
    }
    store.dispatch(addChatMessage(payload));

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
    if (!this.checkedE2EE) {
      this.checkedE2EE = true;
      this._e2eeFeatures =
        store.getState().session.currentRoom.metadata?.roomFeatures?.endToEndEncryptionFeatures;
    }

    if (
      typeof this._e2eeFeatures !== 'undefined' &&
      this._e2eeFeatures.isEnabled &&
      this._e2eeFeatures.includedWhiteboard &&
      this._e2eeFeatures.encryptionKey
    ) {
      try {
        return await decryptMessage(this._e2eeFeatures.encryptionKey, msg);
      } catch (e: any) {
        toast('Decryption error: ' + e.message, {
          type: 'error',
        });
        console.error('Decryption error:' + e.message);
        return undefined;
      }
    } else {
      return msg;
    }
  }
}
