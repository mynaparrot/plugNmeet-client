import ConnectNats from './ConnectNats';
import { EndToEndEncryptionFeatures } from '../../store/slices/interfaces/session';
import { store } from '../../store';
import { decryptMessage } from '../websocket/cryptoMessages';
import { toast } from 'react-toastify';
import { IChatMsg } from '../../store/slices/interfaces/dataMessages';
import { addChatMessage } from '../../store/slices/chatMessagesSlice';
import {
  updateIsActiveChatPanel,
  updateTotalUnreadChatMsgs,
} from '../../store/slices/bottomIconsActivitySlice';
import { updateUnreadMsgFrom } from '../../store/slices/roomSettingsSlice';
import { ChatMessage } from '../proto/plugnmeet_nats_msg_pb';

export default class HandleDataMessage {
  private _that: ConnectNats;
  private _e2eeFeatures: EndToEndEncryptionFeatures | undefined = undefined;

  constructor(that: ConnectNats) {
    this._that = that;
  }

  public handleChatMsg = async (payload: ChatMessage) => {
    if (!this._e2eeFeatures) {
      this._e2eeFeatures =
        store.getState().session.currentRoom.metadata?.room_features.end_to_end_encryption_features;
    }
    if (
      payload.fromUserId !== 'system' &&
      typeof this._e2eeFeatures !== 'undefined' &&
      this._e2eeFeatures.is_enabled &&
      this._e2eeFeatures.included_chat_messages &&
      this._e2eeFeatures.encryption_key
    ) {
      try {
        payload.message = await decryptMessage(
          this._e2eeFeatures.encryption_key,
          payload.message,
        );
      } catch (e: any) {
        toast('Decryption error: ' + e.message, {
          type: 'error',
        });
        console.error('Decryption error:' + e.message);
      }
    }

    const chatMsg: IChatMsg = {
      type: 'CHAT',
      message_id: payload.id,
      time: '',
      from: {
        sid: '',
        userId: payload.fromUserId,
        name: payload.fromName,
      },
      isPrivate: payload.isPrivate,
      msg: payload.message,
    };

    if (payload.toUserId) {
      chatMsg.to = payload.toUserId;
    }

    store.dispatch(addChatMessage(chatMsg));
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
