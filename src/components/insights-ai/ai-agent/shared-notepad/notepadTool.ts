import { store } from '../../../../store';
import {
  setActiveSidePanel,
  updateIsActiveSharedNotePad,
} from '../../../../store/slices/bottomIconsActivitySlice';
import {
  getNotepadController,
  type NotepadBlockSummary,
  type NotepadController,
  type NotepadExternalWriteMode,
} from '../../../shared-notepad/NotepadController';
import { pushNotepadScene } from './notepadSync';

const WRITE_MODES: NotepadExternalWriteMode[] = [
  'replace',
  'append',
  'insert_section',
  'replace_block',
];

/** The notepad is opened by the server and mounted lazily, so both wait a bit. */
const WAIT_STEP_MS = 50;
/** Long enough for the lazy BlockNote bundle plus hydration of a large pad. */
const WAIT_TIMEOUT_MS = 8000;
/** Fallback so the frame wait still resolves in a background tab. */
const FRAME_FALLBACK_MS = 50;

const NOT_ALLOWED = 'The shared notepad is not allowed in this room.';
const NOT_OPENED = 'The shared notepad could not be opened in this room.';
const NOT_READABLE = 'The shared notepad could not be read right now.';

const isWriteMode = (value: unknown): value is NotepadExternalWriteMode =>
  typeof value === 'string' && (WRITE_MODES as string[]).includes(value);

const notepadFeatures = () =>
  store.getState().session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures;

const waitUntil = async (done: () => boolean): Promise<boolean> => {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (!done()) {
    if (Date.now() >= deadline) {
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, WAIT_STEP_MS));
  }
  return true;
};

/** Lets the freshly mounted BlockNote view flush its first render. */
const nextFrame = (): Promise<void> => {
  if (typeof requestAnimationFrame !== 'function') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, FRAME_FALLBACK_MS);
    requestAnimationFrame(() => {
      clearTimeout(timer);
      resolve();
    });
  });
};

/** Syncs the lazily mounted editor and waits until it is usable. */
const prepareController = async (
  controller: NotepadController,
  ready: (controller: NotepadController) => boolean,
): Promise<boolean> => {
  await controller.sync();
  if (!(await waitUntil(() => ready(controller)))) {
    return false;
  }
  // The editor registers its reader/applier before its DOM view has painted;
  // the call must not land on an empty view.
  await nextFrame();
  return true;
};

/** Activates the pad for this client and waits until it can be written. */
const openNotepad = async (
  ready: (controller: NotepadController) => boolean,
): Promise<{ controller: NotepadController; error?: string }> => {
  const controller = getNotepadController();
  if (!notepadFeatures()?.isAllow) {
    return { controller, error: NOT_ALLOWED };
  }

  // b-server activates the notepad before dispatching the call, so the metadata
  // broadcast that announces it may still be in flight.
  if (!(await waitUntil(() => notepadFeatures()?.isActive === true))) {
    return { controller, error: NOT_OPENED };
  }

  store.dispatch(updateIsActiveSharedNotePad(true));

  // A docked pad lives in the side panel slot, so a participant who switched to
  // participants/polls must see it come back instead of just turning active.
  const activity = store.getState().bottomIconsActivity;
  if (activity?.isSharedNotepadDocked && activity.activeSidePanel !== 'SHARED_NOTEPAD') {
    store.dispatch(setActiveSidePanel('SHARED_NOTEPAD'));
  }

  if (!(await prepareController(controller, ready))) {
    return { controller, error: NOT_OPENED };
  }
  return { controller };
};

const blockSummary = (block: NotepadBlockSummary, author: 'agent' | 'participant') => {
  const summary: Record<string, unknown> = {
    id: block.id,
    type: block.type,
    text: block.text,
    markdown: block.markdown,
    author,
  };
  // The prompt line the participant replaced, so the agent can compare.
  if (author === 'participant' && block.originalText) {
    summary.original_agent_text = block.originalText;
  }
  return summary;
};

/**
 * `notepad_write` client tool: writes markdown into the shared notepad of the
 * delegate client. Arguments come straight from the model, so everything is
 * validated before touching the document.
 */
export const executeNotepadWriteTool = async (
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const { mode, markdown, heading, block_id } = args;

  if (!isWriteMode(mode)) {
    return {
      ok: false,
      length: 0,
      error: 'mode must be one of: replace, append, insert_section, replace_block.',
    };
  }
  if (typeof markdown !== 'string' || markdown.trim().length === 0) {
    return { ok: false, length: 0, mode, error: 'markdown must be a non-empty string.' };
  }
  if (heading !== undefined && typeof heading !== 'string') {
    return { ok: false, length: 0, mode, error: 'heading must be a string.' };
  }
  // In-place marking only makes sense on a block the agent has read.
  const blockId = typeof block_id === 'string' ? block_id.trim() : '';
  if (mode === 'replace_block' && !blockId) {
    return {
      ok: false,
      length: 0,
      mode,
      error: 'block_id is required when mode is replace_block.',
    };
  }

  const { controller, error } = await openNotepad((c) => c.isReadyForExternalWrite());
  if (error) {
    return { ok: false, length: 0, mode, error };
  }

  const res = controller.applyExternalWrite(
    mode,
    markdown,
    typeof heading === 'string' && heading.trim() ? heading : undefined,
    mode === 'replace_block' ? blockId : undefined,
  );
  const content = res.ok ? controller.readContent() : null;

  return {
    ok: res.ok,
    length: res.length,
    mode,
    ...(content
      ? {
          participant_count: content.participantBlocks.length,
          agent_count: content.externalBlocks.length,
        }
      : {}),
    ...(res.error ? { error: res.error } : {}),
  };
};

/**
 * `notepad_read` client tool: reports the notepad split by author, so the agent
 * can review what the participant wrote or changed against its own prompts.
 * Reading runs in the background, so it never opens or activates the pad.
 */
export const executeNotepadReadTool = async (
  _args: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const features = notepadFeatures();
  if (!features?.isAllow) {
    return { ok: false, error: NOT_ALLOWED };
  }
  // Nothing to read before the server activates the pad, and waiting for it
  // would block the turn.
  if (!features.isActive) {
    return {
      ok: true,
      markdown: '',
      total_blocks: 0,
      participant_count: 0,
      agent_count: 0,
      participant_blocks: [],
      agent_blocks: [],
    };
  }

  const controller = getNotepadController();
  if (!(await prepareController(controller, (c) => c.isReadyForExternalRead()))) {
    return { ok: false, error: NOT_READABLE };
  }

  const content = controller.readContent();
  if (!content) {
    return { ok: false, error: NOT_READABLE };
  }

  // The server frames this as untrusted notepad data for the current turn.
  pushNotepadScene('notepad_read');

  return {
    ok: true,
    markdown: content.markdown,
    total_blocks: content.blocks.length,
    participant_count: content.participantBlocks.length,
    agent_count: content.externalBlocks.length,
    participant_blocks: content.participantBlocks.map((block) =>
      blockSummary(block, 'participant'),
    ),
    agent_blocks: content.externalBlocks.map((block) => blockSummary(block, 'agent')),
  };
};
