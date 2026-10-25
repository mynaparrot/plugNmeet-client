import type { ChatMessage } from 'plugnmeet-protocol-js';

import i18n from '../../../helpers/i18n';

const SYSTEM_SENDER = 'system';
const WELCOME_MESSAGE_ID = 'system:welcome';

const decodeHtmlEntities = (text: string): string =>
  text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

/**
 * Converts chat message HTML into readable plain text. Deliberately regex based
 * (no DOM) so the export stays testable and never depends on the chat renderer.
 */
export const htmlToPlainText = (html: string): string => {
  if (!html) {
    return '';
  }
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/(p|div|li|ul|ol|tr|blockquote|h[1-6])>/gi, '\n')
    .replace(/<(p|div|h[1-6])[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '');

  return decodeHtmlEntities(withBreaks)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/** User-sent public messages only: no private, system/welcome or deleted ones. */
export const isExportablePublicMessage = (message: ChatMessage): boolean =>
  !message.isPrivate &&
  message.fromUserId !== SYSTEM_SENDER &&
  message.id !== WELCOME_MESSAGE_ID &&
  !message.meta?.isDeleted;

export const countExportablePublicMessages = (messages: ChatMessage[]): number =>
  messages.filter(isExportablePublicMessage).length;

const toIsoTimestamp = (sentAt: ChatMessage['sentAt']): string => {
  const ms = Number(sentAt);
  return Number.isFinite(ms) && ms > 0
    ? new Date(ms).toISOString()
    : i18n.t('export-hub.chat-export-unknown-time');
};

export const buildPublicChatTxt = (
  messages: ChatMessage[],
  exportedAt: Date = new Date(),
): string => {
  const lines = [
    i18n.t('export-hub.chat-export-title'),
    i18n.t('export-hub.exported-at', { timestamp: exportedAt.toISOString() }),
    i18n.t('export-hub.chat-export-note'),
    '',
  ];

  const exportable = messages.filter(isExportablePublicMessage);
  if (exportable.length === 0) {
    lines.push(i18n.t('export-hub.chat-export-empty'));
  }

  exportable.forEach((message) => {
    const text = (
      htmlToPlainText(message.message) || i18n.t('export-hub.chat-export-empty-message')
    ).replace(/\n/g, '\n  ');
    const sender = message.fromName || i18n.t('export-hub.chat-export-unknown-sender');
    lines.push(`[${toIsoTimestamp(message.sentAt)}] ${sender}: ${text}`);
  });

  return `${lines.join('\n')}\n`;
};
