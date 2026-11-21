import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * `publish_chat_message` runs in the delegate's browser: it formats the agent's
 * markdown and hands it to the regular chat transport, so only the store, the
 * markdown pipeline and the NATS connection are stubbed.
 */

const hoisted = vi.hoisted(() => ({
  roomState: { current: {} as Record<string, unknown> },
  conn: { current: undefined as undefined | { sendChatMsg: ReturnType<typeof vi.fn> } },
}));

vi.mock('../../../../store', () => ({ store: { getState: () => hoisted.roomState.current } }));

vi.mock('../../../../helpers/nats', () => ({ getNatsConn: () => hoisted.conn.current }));

vi.mock('../../ai-text-chat/helpers/renderMarkdown', () => ({
  renderMarkdown: (raw: string) => `<p>${raw.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`,
}));

import { executePublishChatMessageTool } from '../chat/chatTool';

const setChatFeatures = (features?: { isAllow: boolean }) => {
  hoisted.roomState.current = {
    session: {
      currentRoom: { metadata: { roomFeatures: features ? { chatFeatures: features } : {} } },
    },
  };
};

let sendChatMsg: ReturnType<typeof vi.fn>;

beforeEach(() => {
  sendChatMsg = vi.fn(async () => undefined);
  hoisted.conn.current = { sendChatMsg };
  setChatFeatures({ isAllow: true });
});

describe('executePublishChatMessageTool', () => {
  it('publishes a markdown message to the public chat', async () => {
    const result = await executePublishChatMessageTool({ message: '**Hello** room' });

    expect(result).toEqual({ ok: true, sent: true, to: 'public' });
    expect(sendChatMsg).toHaveBeenCalledTimes(1);
    const [to, html] = sendChatMsg.mock.calls[0];
    expect(to).toBe('public');
    expect(html).toBe('<p><strong>Hello</strong> room</p>');
  });

  it('sends a private message to the given participant', async () => {
    const result = await executePublishChatMessageTool({
      message: 'Only for you',
      to_user_id: ' user-7 ',
    });

    expect(result).toEqual({ ok: true, sent: true, to: 'user-7' });
    expect(sendChatMsg.mock.calls[0][0]).toBe('user-7');
  });

  it('accepts markdown_text as a fallback field', async () => {
    const result = await executePublishChatMessageTool({ markdown_text: 'from markdown_text' });

    expect(result.ok).toBe(true);
    expect(sendChatMsg).toHaveBeenCalledTimes(1);
  });

  it('rejects an empty message', async () => {
    for (const args of [{}, { message: '   ' }, { message: '' }]) {
      const result = await executePublishChatMessageTool(args);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('message must not be empty.');
    }
    expect(sendChatMsg).not.toHaveBeenCalled();
  });

  it('rejects when the room chat is disabled', async () => {
    setChatFeatures({ isAllow: false });

    const result = await executePublishChatMessageTool({ message: 'Hello' });

    expect(result).toEqual({ ok: false, error: 'Chat is disabled in this room.' });
    expect(sendChatMsg).not.toHaveBeenCalled();
  });

  it('rejects when the nats connection is gone', async () => {
    hoisted.conn.current = undefined;

    const result = await executePublishChatMessageTool({ message: 'Hello' });

    expect(result).toEqual({ ok: false, error: 'Chat connection is not ready.' });
  });

  it('formats the message as chat html', async () => {
    await executePublishChatMessageTool({ message: 'line one\n**line two**' });

    expect(sendChatMsg.mock.calls[0][1]).toBe('<p>line one\n<strong>line two</strong></p>');
  });
});
