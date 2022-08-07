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

export const handleUserTypeData = (
  body: DataMsgBody,
  message_id?: string,
  to?: string,
) => {
  if (body.type === DataMsgBodyType.CHAT) {
    if (!body.messageId) {
      body.messageId = message_id;
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
      msg: body.msg,
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
