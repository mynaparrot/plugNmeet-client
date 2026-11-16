import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

import { store } from '../../../../../store';
import {
  setWhiteboardCurrentPage,
  updateCurrentWhiteboardOfficeFileId,
} from '../../../../../store/slices/whiteboard';
import { A4_BOUNDARY_GUIDE_ID } from '../../../../whiteboard/helpers/constants';
import { ensureBoardOpen, type BoardContext } from '../agentElements';
import { clearAgentHistory, hydrateAgentHistory, popAgentAction } from '../agentHistory';

/** Lets Excalidraw's `setViewport` animation finish before the scroll is sent. */
const VIEWPORT_SETTLE_MS = 400;

const ACTIONS = [
  'clear_board',
  'switch_page',
  'switch_office_file',
  'zoom_to_elements',
  'undo_last_agent_action',
  'unlock_board',
  'lock_board',
] as const;

type Action = (typeof ACTIONS)[number];

const asIds = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean)
    : [];

const zoomToElements = (board: BoardContext, ids: string[]): Record<string, unknown> => {
  if (ids.length === 0) {
    return { ok: false, error: 'element_ids must list at least one element.' };
  }
  const targets = board.elements.filter((element) => ids.includes(element.id));
  if (targets.length === 0 || !board.api) {
    return { ok: false, error: 'None of those elements exist on the current page.' };
  }
  board.api.setViewport({ target: targets, fit: 'contain', animation: true });
  // `setViewport` animates, so the settled scroll is only readable afterwards.
  setTimeout(() => board.controller.broadcastCurrentAppState(), VIEWPORT_SETTLE_MS);
  return { ok: true, action: 'zoom_to_elements', element_ids: targets.map((el) => el.id) };
};

const switchPage = (args: Record<string, unknown>): Record<string, unknown> => {
  const page = Math.round(Number(args.page));
  const totalPages = store.getState().whiteboard.totalPages;
  if (!Number.isFinite(page) || page < 1) {
    return { ok: false, error: 'page must be a positive integer.' };
  }
  if (Number.isInteger(totalPages) && totalPages > 0 && page > totalPages) {
    return { ok: false, error: `page ${page} does not exist; the board has ${totalPages} pages.` };
  }
  store.dispatch(setWhiteboardCurrentPage(page));
  return { ok: true, action: 'switch_page', page };
};

const switchOfficeFile = (args: Record<string, unknown>): Record<string, unknown> => {
  const fileId = typeof args.file_id === 'string' ? args.file_id.trim() : '';
  if (!fileId) {
    return { ok: false, error: 'file_id is required for switch_office_file.' };
  }
  const files = store.getState().whiteboard.whiteboardUploadedOfficeFiles;
  if (files.length > 0 && !files.some((file) => file.fileId === fileId)) {
    return { ok: false, error: `"${fileId}" is not one of this room's whiteboard files.` };
  }
  const page = Math.max(1, Math.round(Number(args.page)) || 1);
  store.dispatch(updateCurrentWhiteboardOfficeFileId({ fileId, page }));
  return { ok: true, action: 'switch_office_file', file_id: fileId, page };
};

/**
 * Removes only the last agent action: its elements become tombstones and any
 * element it overwrote is restored. Participant work is never touched.
 */
const undoLastAgentAction = (board: BoardContext): Record<string, unknown> => {
  const entry = popAgentAction();
  if (!entry) {
    return { ok: false, error: 'There is no agent action left to undo.' };
  }

  const current = new Map(board.controller.getElements().map((el) => [el.id, el]));
  const restore: ExcalidrawElement[] = [];

  for (const added of entry.added) {
    const stored = current.get(added.id);
    const base = stored ?? added;
    restore.push({ ...base, isDeleted: true, version: (base.version ?? 0) + 1 });
  }
  for (const replaced of entry.replaced) {
    const stored = current.get(replaced.before.id);
    restore.push({
      ...replaced.before,
      version: (stored?.version ?? replaced.before.version ?? 0) + 1,
    });
  }

  if (!board.controller.applyExternalElements(restore)) {
    return { ok: false, error: 'The whiteboard refused the undo.' };
  }

  return {
    ok: true,
    action: 'undo_last_agent_action',
    undone_tool: entry.toolName,
    removed_element_ids: entry.added.map((element) => element.id),
  };
};

const clearBoard = (
  board: BoardContext,
  args: Record<string, unknown>,
): Record<string, unknown> => {
  if (args.confirm !== true) {
    return {
      ok: false,
      error:
        'clear_board requires confirm: true. Say out loud that you are clearing the board first.',
    };
  }

  const targets = board.elements.filter(
    (element) => element.id !== A4_BOUNDARY_GUIDE_ID && !element.isDeleted,
  );
  if (targets.length === 0) {
    return { ok: true, action: 'clear_board', cleared: 0 };
  }

  const tombstones: ExcalidrawElement[] = [];
  for (const element of targets) {
    tombstones.push({ ...element, isDeleted: true, version: (element.version ?? 0) + 1 });
  }
  if (!board.controller.applyExternalElements(tombstones)) {
    return { ok: false, error: 'The whiteboard refused to clear.' };
  }

  // A cleared board has nothing left to undo back into.
  clearAgentHistory();
  return { ok: true, action: 'clear_board', cleared: tombstones.length };
};

/** `whiteboard_manage_board`: navigation, zoom, undo and the confirmed clear. */
export const executeWhiteboardManageBoardTool = async (
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const action = String(args.action ?? '') as Action;
  if (!ACTIONS.includes(action)) {
    return { ok: false, error: `action must be one of: ${ACTIONS.join(', ')}.` };
  }

  // Navigation does not need a mounted board, the rest does.
  if (action === 'switch_page') {
    return switchPage(args);
  }
  if (action === 'switch_office_file') {
    return switchOfficeFile(args);
  }
  // b-server applies and broadcasts these lock changes before delegating.
  if (action === 'unlock_board' || action === 'lock_board') {
    return { ok: true, action };
  }

  const lookup = await ensureBoardOpen();
  if ('error' in lookup) {
    return { ok: false, error: lookup.error };
  }
  const board = lookup.board;

  switch (action) {
    case 'zoom_to_elements':
      return zoomToElements(board, asIds(args.element_ids));
    case 'undo_last_agent_action':
      // The history may still be on disk: a reloaded page starts with it empty.
      await hydrateAgentHistory();
      return undoLastAgentAction(board);
    case 'clear_board':
      return clearBoard(board, args);
    default:
      return { ok: false, error: `Unsupported action "${action}".` };
  }
};
