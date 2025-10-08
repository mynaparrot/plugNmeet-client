import { AnalyticsEvents, AnalyticsEventType } from 'plugnmeet-protocol-js';

import { store } from '../../store';
import { getNatsConn } from '../../helpers/nats';

export const publishFileAttachmentToChat = async (
  filePath: string,
  fileName: string,
) => {
  const message = `<a class="attachment-message flex items-center gap-3 break-all" href="${
    (window as any).PLUG_N_MEET_SERVER_URL +
    '/download/uploadedFile/' +
    filePath
  }" target="_blank">
    <span class="h-10 w-10 rounded-xl bg-Gray-50 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
  <path d="M3 12.1817C2.09551 11.5762 1.5 10.5452 1.5 9.375C1.5 7.61732 2.84363 6.17347 4.55981 6.01453C4.91086 3.8791 6.76518 2.25 9 2.25C11.2348 2.25 13.0891 3.8791 13.4402 6.01453C15.1564 6.17347 16.5 7.61732 16.5 9.375C16.5 10.5452 15.9045 11.5762 15 12.1817M6 12.75L9 15.75M9 15.75L12 12.75M9 15.75V9" stroke="#0C131A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg></span><span class="flex-1">${fileName}</span></a>`;

  const conn = getNatsConn();
  if (conn) {
    const selectedChatOption = store.getState().roomSettings.selectedChatOption;
    await conn.sendChatMsg(selectedChatOption, message);

    // send analytics
    conn.sendAnalyticsData(
      AnalyticsEvents.ANALYTICS_EVENT_USER_CHAT_FILES,
      AnalyticsEventType.USER,
      fileName,
    );
  }
};

export const formatDate = (timeStamp: string) => {
  const date = new Date(Number(timeStamp));
  return date.toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};
