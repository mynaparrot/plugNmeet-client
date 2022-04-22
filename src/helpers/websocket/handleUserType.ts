import { IChatMsg } from '../../store/slices/interfaces/dataMessages';
import { store } from '../../store';
import { addChatMessage } from '../../store/slices/chatMessagesSlice';
import { updateTotalUnreadChatMsgs } from '../../store/slices/bottomIconsActivitySlice';

export const handleUserTypeData = (body: IChatMsg, message_id: string) => {
  if (body.type === 'CHAT') {
    if (!body.message_id) {
      body.message_id = message_id;
    }
    store.dispatch(addChatMessage(body));

    if (
      !body.isPrivate &&
      !store.getState().bottomIconsActivity.isActiveChatPanel
    ) {
      store.dispatch(updateTotalUnreadChatMsgs());
    }
  }
};
