import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * `notepad_write` / `notepad_read` run in the delegate's browser: for a write the
 * server has already activated the notepad, but the metadata broadcast and the
 * lazily mounted editor both arrive later. A read may also run while the pad is
 * still inactive. Only the store, the controller and the scene push are stubbed.
 */

const hoisted = vi.hoisted(() => ({
  roomState: { current: {} as Record<string, unknown> },
  dispatch: vi.fn(),
  pushScene: vi.fn(() => true),
  controller: {
    sync: vi.fn(async () => undefined),
    isReadyForExternalWrite: vi.fn(() => true),
    isReadyForExternalRead: vi.fn(() => true),
    applyExternalWrite: vi.fn(() => ({ ok: true, length: 12 })),
    readContent: vi.fn((): unknown => null),
  },
}));

const { roomState, dispatch, controller, pushScene } = hoisted;

type NotepadFeatures = { isAllow: boolean; isActive: boolean };

const setNotepadFeatures = (features: NotepadFeatures) => {
  roomState.current = {
    session: {
      currentRoom: {
        metadata: { roomFeatures: { sharedNotePadFeatures: features } },
      },
    },
  };
};

const features = (): NotepadFeatures =>
  (
    roomState.current as {
      session: {
        currentRoom: { metadata: { roomFeatures: { sharedNotePadFeatures: NotepadFeatures } } };
      };
    }
  ).session.currentRoom.metadata.roomFeatures.sharedNotePadFeatures;

const block = (over: Record<string, unknown>) => ({
  id: 'b1',
  type: 'paragraph',
  text: 'text',
  markdown: 'text',
  author: 'participant',
  ...over,
});

const snapshot = {
  markdown: '# Notes',
  blocks: [
    block({ id: 'b1', text: '1. I ___ (go)', author: 'external' }),
    block({ id: 'b2', text: '1. I went', author: 'participant', originalText: '1. I ___ (go)' }),
  ],
  externalBlocks: [block({ id: 'b1', text: '1. I ___ (go)', author: 'external' })],
  participantBlocks: [
    block({ id: 'b2', text: '1. I went', author: 'participant', originalText: '1. I ___ (go)' }),
  ],
};

vi.mock('../../../../store', () => ({
  store: { getState: () => hoisted.roomState.current, dispatch: hoisted.dispatch },
}));

vi.mock('../../../../store/slices/bottomIconsActivitySlice', () => ({
  updateIsActiveSharedNotePad: (payload: boolean) => ({ type: 'notepad-active', payload }),
}));

vi.mock('../../../shared-notepad/NotepadController', () => ({
  getNotepadController: () => hoisted.controller,
}));

vi.mock('../shared-notepad/notepadSync', () => ({
  pushNotepadScene: hoisted.pushScene,
}));

import { executeNotepadReadTool, executeNotepadWriteTool } from '../shared-notepad/notepadTool';

beforeEach(() => {
  vi.clearAllMocks();
  controller.isReadyForExternalWrite.mockReturnValue(true);
  controller.isReadyForExternalRead.mockReturnValue(true);
  controller.applyExternalWrite.mockReturnValue({ ok: true, length: 12 });
  controller.readContent.mockReturnValue(null);
});

describe('notepad_write', () => {
  it('refuses the write when the room does not allow the notepad', async () => {
    setNotepadFeatures({ isAllow: false, isActive: false });

    const res = await executeNotepadWriteTool({ mode: 'append', markdown: '- item' });

    expect(res).toMatchObject({
      ok: false,
      error: 'The shared notepad is not allowed in this room.',
    });
    expect(controller.sync).not.toHaveBeenCalled();
    expect(controller.applyExternalWrite).not.toHaveBeenCalled();
  });

  it('waits for the server activation, opens the pad and writes', async () => {
    vi.useFakeTimers();
    setNotepadFeatures({ isAllow: true, isActive: false });

    const pending = executeNotepadWriteTool({ mode: 'append', markdown: '# Notes' });
    await vi.advanceTimersByTimeAsync(100);
    // The metadata broadcast from the server activation is still in flight.
    expect(controller.applyExternalWrite).not.toHaveBeenCalled();

    features().isActive = true;
    await vi.advanceTimersByTimeAsync(100);
    const res = await pending;

    expect(dispatch).toHaveBeenCalledWith({ type: 'notepad-active', payload: true });
    expect(controller.sync).toHaveBeenCalled();
    expect(controller.applyExternalWrite).toHaveBeenCalledWith(
      'append',
      '# Notes',
      undefined,
      undefined,
    );
    expect(res).toMatchObject({ ok: true, length: 12, mode: 'append' });
    vi.useRealTimers();
  });

  it('waits for the lazily mounted editor to register its applier', async () => {
    vi.useFakeTimers();
    setNotepadFeatures({ isAllow: true, isActive: true });
    controller.isReadyForExternalWrite.mockReturnValue(false);

    const pending = executeNotepadWriteTool({
      mode: 'replace',
      markdown: '# Notes',
      heading: 'Recap',
    });
    await vi.advanceTimersByTimeAsync(200);
    expect(controller.applyExternalWrite).not.toHaveBeenCalled();

    controller.isReadyForExternalWrite.mockReturnValue(true);
    await vi.advanceTimersByTimeAsync(200);
    await pending;

    expect(controller.applyExternalWrite).toHaveBeenCalledWith(
      'replace',
      '# Notes',
      'Recap',
      undefined,
    );
    vi.useRealTimers();
  });

  it('rewrites one block in place when mode is replace_block', async () => {
    setNotepadFeatures({ isAllow: true, isActive: true });

    const res = await executeNotepadWriteTool({
      mode: 'replace_block',
      block_id: 'b2',
      markdown: 'I <u>went</u> to school',
    });

    expect(controller.applyExternalWrite).toHaveBeenCalledWith(
      'replace_block',
      'I <u>went</u> to school',
      undefined,
      'b2',
    );
    expect(res).toMatchObject({ ok: true, mode: 'replace_block' });
  });

  it('requires a block_id for replace_block', async () => {
    setNotepadFeatures({ isAllow: true, isActive: true });

    const res = await executeNotepadWriteTool({ mode: 'replace_block', markdown: 'oops' });

    expect(res).toMatchObject({
      ok: false,
      error: 'block_id is required when mode is replace_block.',
    });
    expect(controller.applyExternalWrite).not.toHaveBeenCalled();
  });

  it('fails instead of writing into an editor that never opened', async () => {
    vi.useFakeTimers();
    setNotepadFeatures({ isAllow: true, isActive: true });
    controller.isReadyForExternalWrite.mockReturnValue(false);

    const pending = executeNotepadWriteTool({ mode: 'append', markdown: '# Notes' });
    await vi.advanceTimersByTimeAsync(9000);
    const res = await pending;

    expect(res).toMatchObject({
      ok: false,
      error: 'The shared notepad could not be opened in this room.',
    });
    expect(controller.applyExternalWrite).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('reports the authorship counts of the note it just wrote into', async () => {
    setNotepadFeatures({ isAllow: true, isActive: true });
    controller.readContent.mockReturnValue(snapshot);

    const res = await executeNotepadWriteTool({ mode: 'append', markdown: '# Notes' });

    expect(res).toMatchObject({ ok: true, participant_count: 1, agent_count: 1 });
  });
});

describe('notepad_read', () => {
  it('refuses the read when the room does not allow the notepad', async () => {
    setNotepadFeatures({ isAllow: false, isActive: false });

    const res = await executeNotepadReadTool({});

    expect(res).toMatchObject({
      ok: false,
      error: 'The shared notepad is not allowed in this room.',
    });
    expect(controller.sync).not.toHaveBeenCalled();
  });

  it('returns an empty read instead of waiting when the pad is inactive', async () => {
    vi.useFakeTimers();
    setNotepadFeatures({ isAllow: true, isActive: false });
    controller.readContent.mockReturnValue(snapshot);

    // No timer is advanced: an inactive pad must not make the read wait.
    const res = await executeNotepadReadTool({});

    expect(res).toEqual({
      ok: true,
      markdown: '',
      total_blocks: 0,
      participant_count: 0,
      agent_count: 0,
      participant_blocks: [],
      agent_blocks: [],
    });
    expect(controller.sync).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    expect(pushScene).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('returns the blocks split by author without opening the pad', async () => {
    setNotepadFeatures({ isAllow: true, isActive: true });
    controller.readContent.mockReturnValue(snapshot);

    const res = await executeNotepadReadTool({});

    // Reading in the background must not pop the pad open for the participant.
    expect(dispatch).not.toHaveBeenCalled();
    expect(controller.sync).toHaveBeenCalled();
    expect(pushScene).toHaveBeenCalledWith('notepad_read');
    expect(res).toMatchObject({
      ok: true,
      markdown: '# Notes',
      total_blocks: 2,
      participant_count: 1,
      agent_count: 1,
    });
    expect(res.participant_blocks).toEqual([
      {
        id: 'b2',
        type: 'paragraph',
        text: '1. I went',
        markdown: 'text',
        author: 'participant',
        original_agent_text: '1. I ___ (go)',
      },
    ]);
    expect(res.agent_blocks).toEqual([
      { id: 'b1', type: 'paragraph', text: '1. I ___ (go)', markdown: 'text', author: 'agent' },
    ]);
  });

  it('waits for the editor to become readable', async () => {
    vi.useFakeTimers();
    setNotepadFeatures({ isAllow: true, isActive: true });
    controller.isReadyForExternalRead.mockReturnValue(false);
    controller.readContent.mockReturnValue(snapshot);

    const pending = executeNotepadReadTool({});
    await vi.advanceTimersByTimeAsync(200);
    expect(pushScene).not.toHaveBeenCalled();

    controller.isReadyForExternalRead.mockReturnValue(true);
    await vi.advanceTimersByTimeAsync(200);
    const res = await pending;

    expect(res).toMatchObject({ ok: true, participant_count: 1 });
    expect(dispatch).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('fails when the notepad never becomes readable', async () => {
    vi.useFakeTimers();
    setNotepadFeatures({ isAllow: true, isActive: true });
    controller.readContent.mockReturnValue(null);

    const pending = executeNotepadReadTool({});
    await vi.advanceTimersByTimeAsync(4000);
    const res = await pending;

    expect(res).toMatchObject({
      ok: false,
      error: 'The shared notepad could not be read right now.',
    });
    expect(pushScene).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
