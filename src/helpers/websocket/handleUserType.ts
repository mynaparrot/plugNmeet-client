import { IChatMsg } from '../../store/slices/interfaces/dataMessages';
import { store } from '../../store';
import { addChatMessage } from '../../store/slices/chatMessagesSlice';
import { updateTotalUnreadChatMsgs } from '../../store/slices/bottomIconsActivitySlice';
import { updateUnreadMsgFrom } from '../../store/slices/roomSettingsSlice';

export const handleUserTypeData = (
  body: IChatMsg,
  message_id: string,
  to?: string,
) => {
  if (body.type === 'CHAT') {
    if (!body.message_id) {
      body.message_id = message_id;
    }
    body.to = to;
    store.dispatch(addChatMessage(body));

    const isActiveChatPanel =
      store.getState().bottomIconsActivity.isActiveChatPanel;
    if (!isActiveChatPanel) {
      store.dispatch(updateTotalUnreadChatMsgs());
    }
    const selectedChatOption = store.getState().roomSettings.selectedChatOption;
    const currentUser = store.getState().session.currentUser;
    if (!body.isPrivate && selectedChatOption !== 'public') {
      store.dispatch(
        updateUnreadMsgFrom({
          task: 'ADD',
          id: 'public',
        }),
      );
    } else if (
      body.isPrivate &&
      selectedChatOption !== body.from.userId &&
      body.from.userId !== currentUser?.userId
    ) {
      store.dispatch(
        updateUnreadMsgFrom({
          task: 'ADD',
          id: body.from.userId,
        }),
      );
    }
  }
};
