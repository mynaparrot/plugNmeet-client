import { beforeEach, describe, expect, it, vi } from 'vitest';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  BreakoutRoomResSchema,
  CloudRecordingVariants,
  CommonResponseSchema,
  CreateBreakoutRoomsReqSchema,
  InsightsTranscriptionConfigReqSchema,
  RecordingReqSchema,
  RecordingTasks,
} from 'plugnmeet-protocol-js';

const hoisted = vi.hoisted(() => ({
  sendAPIRequest: vi.fn(),
  dispatch: vi.fn(),
  registerAIAgentToolHandler: vi.fn(),
  getConfigValue: vi.fn(),
  state: { current: {} as Record<string, unknown> },
}));

vi.mock('../../../../helpers/api/plugNmeetAPI', () => ({ default: hoisted.sendAPIRequest }));
vi.mock('../../../../helpers/utils', () => ({ getConfigValue: hoisted.getConfigValue }));
vi.mock('../../../../store', () => ({
  store: { getState: () => hoisted.state.current, dispatch: hoisted.dispatch },
}));
vi.mock('../../../../store/services/breakoutRoomApi', () => ({
  breakoutRoomApi: {
    util: {
      invalidateTags: (tags: string[]) => ({
        type: 'breakoutRoomApi/invalidateTags',
        payload: tags,
      }),
    },
  },
}));
// The dispatcher pulls in the whole agent/whiteboard stack; only the registry
// call matters here.
vi.mock('../toolDispatcher', () => ({
  registerAIAgentToolHandler: hoisted.registerAIAgentToolHandler,
}));

import {
  CLIENT_API_SUBMIT_TOOL,
  executeClientApiSubmitTool,
  registerClientApiRoute,
  registerClientApiTools,
} from '../clientApiTools';

const { sendAPIRequest, dispatch, getConfigValue, state } = hoisted;

const commonResponseBytes = (status: boolean, msg: string) =>
  toBinary(CommonResponseSchema, create(CommonResponseSchema, { status, msg }));

const breakoutResBytes = (status: boolean, msg: string) =>
  toBinary(BreakoutRoomResSchema, create(BreakoutRoomResSchema, { status, msg }));

const buildState = (e2eeFeatures?: Record<string, unknown>) => ({
  session: {
    currentRoom: {
      roomId: 'room-1',
      metadata: { roomFeatures: { endToEndEncryptionFeatures: e2eeFeatures } },
    },
  },
});

const lastCall = () => sendAPIRequest.mock.calls[sendAPIRequest.mock.calls.length - 1];
const sentBody = () => lastCall()?.[1];

describe('executeClientApiSubmitTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.current = buildState();
    getConfigValue.mockReturnValue(undefined);
    sendAPIRequest.mockResolvedValue(commonResponseBytes(true, 'ok'));
  });

  it('serializes breakoutRoom/create, submits it and invalidates the room list', async () => {
    sendAPIRequest.mockResolvedValue(breakoutResBytes(true, 'created'));

    const result = await executeClientApiSubmitTool({
      route: 'breakoutRoom/create',
      payload: { roomId: 'room-1', duration: '300', rooms: [{ id: '1', title: 'Group A' }] },
    });

    expect(result).toEqual({ ok: true, msg: 'created' });
    expect(sendAPIRequest).toHaveBeenCalledWith(
      'breakoutRoom/create',
      expect.any(Uint8Array),
      false,
      'application/protobuf',
      'arraybuffer',
    );

    const body = fromBinary(CreateBreakoutRoomsReqSchema, sentBody() as Uint8Array);
    expect(body.roomId).toBe('room-1');
    expect(body.duration).toBe('300');
    expect(body.rooms.map((room) => room.id)).toEqual(['1']);

    expect(dispatch).toHaveBeenCalledWith({
      type: 'breakoutRoomApi/invalidateTags',
      payload: ['List'],
    });
  });

  it('accepts the payload as a JSON string', async () => {
    await executeClientApiSubmitTool({
      route: 'breakoutRoom/create',
      payload: JSON.stringify({ roomId: 'room-2' }),
    });

    const body = fromBinary(CreateBreakoutRoomsReqSchema, sentBody() as Uint8Array);
    expect(body.roomId).toBe('room-2');
  });

  it('configures transcription from the request payload', async () => {
    const result = await executeClientApiSubmitTool({
      route: 'insights/transcription/configure',
      payload: { isEnabled: true, allowedSpokenLangs: ['en-US'], isEnabledTranslation: true },
    });

    expect(result.ok).toBe(true);
    const body = fromBinary(InsightsTranscriptionConfigReqSchema, sentBody() as Uint8Array);
    expect(body.isEnabled).toBe(true);
    expect(body.allowedSpokenLangs).toEqual(['en-US']);
    expect(body.isEnabledTranslation).toBe(true);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('ends transcription without a request schema by sending an empty body', async () => {
    const result = await executeClientApiSubmitTool({ route: 'insights/transcription/end' });

    expect(result).toEqual({ ok: true, msg: 'ok' });
    expect(sendAPIRequest).toHaveBeenCalledWith(
      'insights/transcription/end',
      [],
      false,
      'application/protobuf',
      'arraybuffer',
    );
  });

  it('injects the design customization when recording is started without one', async () => {
    getConfigValue.mockReturnValue({ primaryColor: '#ff0000' });

    const result = await executeClientApiSubmitTool({
      route: 'recording',
      payload: { task: RecordingTasks.START_RECORDING, roomId: 'room-1', sid: 'sid-1' },
    });

    expect(result.ok).toBe(true);
    expect(getConfigValue).toHaveBeenCalledWith(
      'designCustomization',
      undefined,
      'DESIGN_CUSTOMIZATION',
    );
    const body = fromBinary(RecordingReqSchema, sentBody() as Uint8Array);
    expect(body.task).toBe(RecordingTasks.START_RECORDING);
    expect(body.customDesign).toBe('{"primaryColor":"#ff0000"}');
  });

  it('keeps a customDesign sent by the server', async () => {
    getConfigValue.mockReturnValue({ primaryColor: '#ff0000' });

    await executeClientApiSubmitTool({
      route: 'rtmp',
      payload: {
        task: RecordingTasks.START_RECORDING,
        rtmpUrl: 'rtmp://example.com',
        customDesign: '{"a": 1}',
      },
    });

    const body = fromBinary(RecordingReqSchema, sentBody() as Uint8Array);
    expect(body.customDesign).toBe('{"a": 1}');
    expect(getConfigValue).not.toHaveBeenCalled();
  });

  it('rejects recording when a self-inserted E2EE key is enabled', async () => {
    state.current = buildState({ isEnabled: true, enabledSelfInsertEncryptionKey: true });

    const result = await executeClientApiSubmitTool({
      route: 'recording',
      payload: { task: RecordingTasks.START_RECORDING, roomId: 'room-1' },
    });

    expect(result).toEqual({
      ok: false,
      error: 'Recording is not supported when self-inserted E2EE key is enabled.',
    });
    expect(sendAPIRequest).not.toHaveBeenCalled();
  });

  it('rejects media-only cloud recording while E2EE is enabled', async () => {
    state.current = buildState({ isEnabled: true });

    const result = await executeClientApiSubmitTool({
      route: 'recording',
      payload: {
        task: RecordingTasks.START_RECORDING,
        recordingVariant: CloudRecordingVariants.MEDIA_ONLY_CLOUD_RECORDING,
      },
    });

    expect(result).toEqual({
      ok: false,
      error: 'Media-only cloud recording is not supported when E2EE is enabled.',
    });
    expect(sendAPIRequest).not.toHaveBeenCalled();
  });

  it('supports newly registered routes', async () => {
    registerClientApiRoute('myFeature/start', {
      endpoint: 'myFeature/start',
      requestSchema: RecordingReqSchema,
      responseSchema: CommonResponseSchema,
    });

    const result = await executeClientApiSubmitTool({
      route: 'myFeature/start',
      payload: { task: RecordingTasks.STOP_RECORDING, roomId: 'room-1' },
    });

    expect(result).toEqual({ ok: true, msg: 'ok' });
    expect(lastCall()?.[0]).toBe('myFeature/start');
    const body = fromBinary(RecordingReqSchema, sentBody() as Uint8Array);
    expect(body.task).toBe(RecordingTasks.STOP_RECORDING);
  });

  it('propagates a failed response of a custom route', async () => {
    registerClientApiRoute('myFeature/fail', { endpoint: 'myFeature/fail' });
    sendAPIRequest.mockResolvedValue(commonResponseBytes(false, 'not allowed'));

    const result = await executeClientApiSubmitTool({ route: 'myFeature/fail' });

    expect(result).toEqual({ ok: false, error: 'not allowed' });
  });

  it('reports unknown routes', async () => {
    const result = await executeClientApiSubmitTool({ route: 'unknown/route' });

    expect(result).toEqual({ ok: false, error: 'Unsupported client API route: unknown/route' });
    expect(sendAPIRequest).not.toHaveBeenCalled();
  });
});

describe('registerClientApiTools', () => {
  it('registers the client_api_submit tool', () => {
    registerClientApiTools();

    expect(hoisted.registerAIAgentToolHandler).toHaveBeenCalledWith(
      CLIENT_API_SUBMIT_TOOL,
      executeClientApiSubmitTool,
    );
    expect(CLIENT_API_SUBMIT_TOOL).toBe('client_api_submit');
  });
});
