import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

import { DB_STORE_NAMES, idbGet, idbStore } from '../../../../helpers/libs/idb';

/** How many agent actions stay undoable. */
export const MAX_AGENT_HISTORY = 20;

/**
 * Lives in the whiteboard store, but never collides with the page snapshots
 * because those keys are always `${fileId}_${page}`.
 */
const AGENT_HISTORY_IDB_KEY = '__ai_agent_history__';

export type AgentHistoryEntry = {
  toolName: string;
  createdAt: number;
  /** Page the action was written to; older entries predate the scope. */
  fileId?: string;
  page?: number;
  /** Elements the action created, exactly as they were written. */
  added: ExcalidrawElement[];
  /** Elements the action overwrote, with the value to restore. */
  replaced: { before: ExcalidrawElement; after: ExcalidrawElement }[];
};

/** The page an action belongs to: undo only ever touches the current one. */
export type AgentHistoryScope = { fileId: string; page: number };

const history: AgentHistoryEntry[] = [];

/** IndexedDB is optional: without it the undo history just does not survive a reload. */
const persistHistory = async (): Promise<void> => {
  try {
    await idbStore(DB_STORE_NAMES.WHITEBOARD, AGENT_HISTORY_IDB_KEY, [...history]);
  } catch {
    // The in-memory copy stays authoritative.
  }
};

/** Restores the undo history after a reload; a live history always wins. */
export const hydrateAgentHistory = async (): Promise<void> => {
  if (history.length > 0) {
    return;
  }
  try {
    const stored = await idbGet<AgentHistoryEntry[]>(
      DB_STORE_NAMES.WHITEBOARD,
      AGENT_HISTORY_IDB_KEY,
    );
    if (history.length === 0 && Array.isArray(stored)) {
      history.push(...stored.slice(-MAX_AGENT_HISTORY));
    }
  } catch {
    // Nothing stored yet: start with an empty history.
  }
};

/** Records one tool action, dropping the oldest beyond `MAX_AGENT_HISTORY`. */
export const pushAgentAction = (entry: AgentHistoryEntry) => {
  history.push(entry);
  while (history.length > MAX_AGENT_HISTORY) {
    history.shift();
  }
  void persistHistory();
};

/**
 * Removes and returns the newest entry: undo consumes it. With a scope only the
 * newest entry of that page is undone, so an undo on one page never eats the
 * action of another.
 */
export const popAgentAction = (scope?: AgentHistoryScope): AgentHistoryEntry | undefined => {
  let index = history.length - 1;
  if (scope) {
    index = -1;
    for (let i = history.length - 1; i >= 0; i--) {
      const entry = history[i];
      if (
        entry.fileId === undefined ||
        (entry.fileId === scope.fileId && entry.page === scope.page)
      ) {
        index = i;
        break;
      }
    }
  }
  if (index < 0) {
    return undefined;
  }
  const [entry] = history.splice(index, 1);
  void persistHistory();
  return entry;
};

export const peekAgentAction = (): AgentHistoryEntry | undefined => history[history.length - 1];

export const agentHistorySize = (): number => history.length;

export const clearAgentHistory = () => {
  history.length = 0;
  void persistHistory();
};
