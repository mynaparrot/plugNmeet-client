import { store } from '../../store';
import { addChatMessage } from '../../store/slices/chatMessagesSlice';
import {
  updateIsActiveChatPanel,
  updateTotalUnreadChatMsgs,
} from '../../store/slices/bottomIconsActivitySlice';
import { updateUnreadMsgFrom } from '../../store/slices/roomSettingsSlice';
import {
  DataMsgBody,
  DataMsgBodyType,
} from '../proto/plugnmeet_datamessage_pb';
import { IChatMsg } from '../../store/slices/interfaces/dataMessages';
import { decryptMessage } from './cryptoMessages';
import { EndToEndEncryptionFeatures } from '../../store/slices/interfaces/session';

let e2ee: EndToEndEncryptionFeatures | undefined = undefined;

export const handleUserTypeData = async (
  body: DataMsgBody,
  message_id?: string,
  to?: string,
) => {
  if (body.type === DataMsgBodyType.CHAT) {
    if (!body.messageId) {
      body.messageId = message_id;
    }
    let finalMsg = body.msg;
    if (!e2ee) {
      e2ee =
        store.getState().session.currentRoom.metadata?.room_features
          .end_to_end_encryption_features;
    }
    if (
      body.from?.userId !== 'system' &&
      typeof e2ee !== 'undefined' &&
      e2ee.is_enabled &&
      e2ee.included_chat_messages &&
      e2ee.encryption_key
    ) {
      try {
        finalMsg = await decryptMessage(e2ee.encryption_key, body.msg);
      } catch (e: any) {
        console.error(e.message);
      }
    }

    const chatMsg: IChatMsg = {
      type: 'CHAT',
      message_id: body.messageId ?? '',
      time: body.time ?? '',
      from: {
        sid: body.from?.sid ?? '',
        userId: body.from?.userId ?? '',
        name: body.from?.name,
      },
      isPrivate: body.isPrivate === 1,
      msg: finalMsg,
    };

    if (to) {
      chatMsg.to = to;
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

    if (!body.isPrivate && selectedChatOption !== 'public') {
      store.dispatch(
        updateUnreadMsgFrom({
          task: 'ADD',
          id: 'public',
        }),
      );
    } else if (
      body.isPrivate &&
      selectedChatOption !== body.from?.userId &&
      body.from?.userId !== currentUser?.userId
    ) {
      store.dispatch(
        updateUnreadMsgFrom({
          task: 'ADD',
          id: body.from?.userId ?? '',
        }),
      );
    }
  }
};
