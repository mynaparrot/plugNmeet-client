import {
  AnalyticsEvents,
  AnalyticsEventType,
  ChatMessage,
} from 'plugnmeet-protocol-js';

import { store } from '../../store';
import { getNatsConn } from '../../helpers/nats';
import { getConfigValue } from '../../helpers/utils';

export const CHAT_EDIT_WINDOW_MS = 10 * 60 * 1000;

const ATTACHMENT_MARKER = 'attachment-message';
const SYSTEM_SENDER = 'system';

const decodeHtmlEntities = (text: string): string =>
  text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

export const htmlToEditableText = (html: string): string => {
  if (!html) {
    return '';
  }
  const el = document.createElement('div');
  el.innerHTML = html;
  return htmlToMarkdown(el).trim();
};

// Restores composer markdown from rendered chat HTML so editing keeps fences,
// lists, and inline styles. Prebuilt server cards (attachment/poll markup)
// have no markdown equivalent — fall back to plain text for those.
const htmlToMarkdown = (node: Node): string => {
  let out = '';
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      out += child.textContent ?? '';
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();
    switch (tag) {
      case 'pre': {
        const code = el.querySelector('code');
        const codeText = (code ?? el).textContent?.replace(/\n$/, '') ?? '';
        const langMatch = /language-([\w+-]+)/.exec(
          code?.getAttribute('class') ?? '',
        );
        out += `\n\`\`\`${langMatch?.[1] ?? ''}\n${codeText}\n\`\`\`\n`;
        break;
      }
      case 'br':
        out += '\n';
        break;
      case 'p':
      case 'div':
        out += `${htmlToMarkdown(el).trim()}\n\n`;
        break;
      case 'li':
        out += `- ${htmlToMarkdown(el).trim()}\n`;
        break;
      case 'ul':
      case 'ol':
        out += `${htmlToMarkdown(el)}\n`;
        break;
      case 'blockquote':
        out +=
          htmlToMarkdown(el)
            .trim()
            .split('\n')
            .map((line) => `> ${line}`)
            .join('\n') + '\n\n';
        break;
      case 'h1':
        out += `# ${htmlToMarkdown(el).trim()}\n\n`;
        break;
      case 'h2':
        out += `## ${htmlToMarkdown(el).trim()}\n\n`;
        break;
      case 'h3':
        out += `### ${htmlToMarkdown(el).trim()}\n\n`;
        break;
      case 'h4':
        out += `#### ${htmlToMarkdown(el).trim()}\n\n`;
        break;
      case 'h5':
        out += `##### ${htmlToMarkdown(el).trim()}\n\n`;
        break;
      case 'h6':
        out += `###### ${htmlToMarkdown(el).trim()}\n\n`;
        break;
      case 'strong':
      case 'b':
        out += `**${htmlToMarkdown(el)}**`;
        break;
      case 'em':
      case 'i':
        out += `*${htmlToMarkdown(el)}*`;
        break;
      case 'del':
        out += `~~${htmlToMarkdown(el)}~~`;
        break;
      case 'code':
        out += `\`${el.textContent ?? ''}\``;
        break;
      case 'a': {
        const href = el.getAttribute('href') ?? '';
        const text = htmlToMarkdown(el).trim();
        out += href && href !== text ? `[${text}](${href})` : text;
        break;
      }
      case 'hr':
        out += '\n---\n';
        break;
      case 'tr':
        out += `${htmlToMarkdown(el).trim()}\n`;
        break;
      default:
        out += htmlToMarkdown(el);
        break;
    }
  });
  return decodeHtmlEntities(out);
};

export const getPlainTextSnippet = (html: string, maxLen = 120): string => {
  if (!html) {
    return '';
  }
  const el = document.createElement('div');
  el.innerHTML = html;
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLen) {
    return text;
  }
  return text.slice(0, maxLen - 1).trimEnd() + '…';
};

const isAttachmentMessage = (msg: ChatMessage): boolean =>
  msg.message.includes(ATTACHMENT_MARKER);

const isSystemMessage = (msg: ChatMessage): boolean =>
  msg.fromUserId === SYSTEM_SENDER;

const isDeletedMessage = (msg: ChatMessage): boolean => !!msg.meta?.isDeleted;

export const canReplyMessage = (msg: ChatMessage): boolean => {
  return !(isSystemMessage(msg) || isDeletedMessage(msg));
};

export const isEditWindowExpired = (
  msg: ChatMessage,
  now: number = Date.now(),
): boolean => {
  const sentAt = Number(msg.sentAt);
  if (!Number.isFinite(sentAt)) {
    return true;
  }
  return now - sentAt > CHAT_EDIT_WINDOW_MS;
};

export const canEditMessage = (msg: ChatMessage, currentUserId: string) => {
  if (isSystemMessage(msg) || isDeletedMessage(msg)) {
    return false;
  }
  if (isAttachmentMessage(msg)) {
    return false;
  }
  if (msg.fromUserId !== currentUserId) {
    return false;
  }
  return !isEditWindowExpired(msg);
};

export const canDeleteMessage = (
  msg: ChatMessage,
  currentUserId: string,
  isAdmin: boolean,
): boolean => {
  if (isSystemMessage(msg) || isDeletedMessage(msg)) {
    return false;
  }
  if (isAdmin) {
    return true;
  }
  if (msg.fromUserId !== currentUserId) {
    return false;
  }
  return !isEditWindowExpired(msg);
};

const serverUrl = getConfigValue<string>(
  'serverUrl',
  'http://localhost:8080',
  'PLUG_N_MEET_SERVER_URL',
);

export const publishFileAttachmentToChat = async (
  filePath: string,
  fileName: string,
) => {
  const message = `<a class="attachment-message flex items-center gap-3 break-all" href="${
    serverUrl + '/download/uploadedFile/' + window.encodeURIComponent(filePath)
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
