import { IChatMsg } from '../../store/slices/interfaces/dataMessages';
import { store } from '../../store';
import { addChatMessage } from '../../store/slices/chatMessagesSlice';
import { updateTotalUnreadChatMsgs } from '../../store/slices/bottomIconsActivitySlice';
import { updateUnreadPrivateMsgFrom } from '../../store/slices/roomSettingsSlice';

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
    if (!body.isPrivate && selectedChatOption !== 'public') {
      store.dispatch(updateUnreadPrivateMsgFrom('public'));
    } else if (body.isPrivate && selectedChatOption !== body.from.userId) {
      store.dispatch(updateUnreadPrivateMsgFrom(body.from.userId));
    }
  }
};
