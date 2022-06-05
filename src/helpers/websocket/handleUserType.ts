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
    const selectedTab = store.getState().roomSettings.selectedChatTab;
    if (body.isPrivate) {
      if (!isActiveChatPanel) {
        store.dispatch(updateUnreadPrivateMsgFrom(body.from.userId));
      } else if (selectedTab.userId !== body.from.userId) {
        store.dispatch(updateUnreadPrivateMsgFrom(body.from.userId));
      }
    }
  }
};
