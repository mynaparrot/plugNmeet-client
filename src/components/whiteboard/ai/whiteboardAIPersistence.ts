import type { SavedChats, TTDPersistenceAdapter } from '@excalidraw/excalidraw';

import { DB_STORE_NAMES, idbGet, idbStore } from '../../../helpers/libs/idb';

const WHITEBOARD_AI_CHATS_KEY = 'ai-chats';

export const whiteboardPersistenceAdapter: TTDPersistenceAdapter = {
  async loadChats() {
    try {
      const chats = await idbGet<SavedChats>(
        DB_STORE_NAMES.WHITEBOARD_AI_CHATS,
        WHITEBOARD_AI_CHATS_KEY,
      );
      if (!chats) {
        return [];
      }
      return chats.map((chat) =>
        Object.assign({}, chat, {
          messages: chat.messages.map((msg) =>
            Object.assign({}, msg, {
              timestamp:
                msg.timestamp instanceof Date
                  ? msg.timestamp
                  : new Date(msg.timestamp),
            }),
          ),
        }),
      );
    } catch {
      return [];
    }
  },
  async saveChats(chats) {
    try {
      await idbStore(
        DB_STORE_NAMES.WHITEBOARD_AI_CHATS,
        WHITEBOARD_AI_CHATS_KEY,
        chats,
      );
    } catch {}
  },
};
