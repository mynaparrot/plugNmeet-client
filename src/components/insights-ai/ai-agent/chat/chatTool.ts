import { getNatsConn } from '../../../../helpers/nats';
import { store } from '../../../../store';
import { renderMarkdown } from '../../ai-text-chat/helpers/renderMarkdown';
import type { AIAgentToolHandler } from '../toolDispatcher';

export const PUBLISH_CHAT_MESSAGE_TOOL = 'publish_chat_message';

const EMPTY_MESSAGE = 'message must not be empty.';

/**
 * Posts the agent's message into the room chat through this client, so it
 * appears exactly like a message typed here: `sendChatMsg` stores it locally and
 * broadcasts it over NATS. The chat panel stays closed on purpose.
 */
export const executePublishChatMessageTool: AIAgentToolHandler = async (args) => {
  const message =
    typeof args.message === 'string' && args.message.trim()
      ? args.message.trim()
      : typeof args.markdown_text === 'string'
        ? args.markdown_text.trim()
        : '';
  if (!message) {
    return { ok: false, error: EMPTY_MESSAGE };
  }

  const chatFeatures = store.getState().session.currentRoom?.metadata?.roomFeatures?.chatFeatures;
  if (chatFeatures && chatFeatures.isAllow === false) {
    return { ok: false, error: 'Chat is disabled in this room.' };
  }

  const conn = getNatsConn();
  if (!conn) {
    return { ok: false, error: 'Chat connection is not ready.' };
  }

  // Same pipeline as the chat composers: sanitized markdown, single newlines
  // become <br>. The chat panel applies its own whitelist when rendering.
  const html = renderMarkdown(message);
  if (!html) {
    return { ok: false, error: EMPTY_MESSAGE };
  }

  const toUserId = typeof args.to_user_id === 'string' ? args.to_user_id.trim() : '';
  const to = toUserId || 'public';

  await conn.sendChatMsg(to, html);

  return { ok: true, sent: true, to };
};
