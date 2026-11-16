import {
  fromBinary,
  fromJson,
  toBinary,
  type DescMessage,
  type JsonValue,
  type MessageShape,
} from '@bufbuild/protobuf';
import {
  BreakoutRoomResSchema,
  CloudRecordingVariants,
  CommonResponseSchema,
  CreateBreakoutRoomsReqSchema,
  InsightsAIMeetingSummarizationConfigReqSchema,
  InsightsChatTranslationConfigReqSchema,
  InsightsTranscriptionConfigReqSchema,
  RecordingReqSchema,
} from 'plugnmeet-protocol-js';

import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { getPnmApiError } from '../../../helpers/api/apiError';
import { getConfigValue } from '../../../helpers/utils';
import { store } from '../../../store';
import { breakoutRoomApi } from '../../../store/services/breakoutRoomApi';
import { registerAIAgentToolHandler, type AIAgentToolHandler } from './toolDispatcher';

/**
 * One API call the agent may trigger from the Admin's browser. The server only
 * prepares the route + payload; the request itself is sent from here so that
 * it is validated by the auth router.
 */
export interface ClientApiRouteDescriptor<
  TReq extends DescMessage = DescMessage,
  TRes extends DescMessage = DescMessage,
> {
  endpoint: string;
  requestSchema?: TReq;
  responseSchema?: TRes;
  beforeSend?: (msg: MessageShape<TReq>) => { ok: true } | { ok: false; error: string };
  afterSuccess?: () => void;
}

/**
 * Stored form of a descriptor: the schemas lose their per-route typing, while
 * `beforeSend` receives the already parsed message of that route.
 */
export type RegisteredClientApiRoute = Omit<
  ClientApiRouteDescriptor<DescMessage, DescMessage>,
  'beforeSend'
> & {
  beforeSend?: (msg: any) => { ok: true } | { ok: false; error: string };
};

const clientApiRoutes = new Map<string, RegisteredClientApiRoute>();

/** Adds or overrides a route; later features need only one call here. */
export const registerClientApiRoute = (route: string, descriptor: RegisteredClientApiRoute) => {
  clientApiRoutes.set(route, descriptor);
};

const recordingBeforeSend = (
  route: 'recording' | 'rtmp',
): ClientApiRouteDescriptor<typeof RecordingReqSchema>['beforeSend'] => {
  return (msg) => {
    const e2eeFeatures =
      store.getState().session.currentRoom.metadata?.roomFeatures?.endToEndEncryptionFeatures;

    if (e2eeFeatures?.enabledSelfInsertEncryptionKey) {
      return {
        ok: false,
        error: 'Recording is not supported when self-inserted E2EE key is enabled.',
      };
    }
    if (
      route === 'recording' &&
      msg.recordingVariant === CloudRecordingVariants.MEDIA_ONLY_CLOUD_RECORDING &&
      e2eeFeatures?.isEnabled
    ) {
      return {
        ok: false,
        error: 'Media-only cloud recording is not supported when E2EE is enabled.',
      };
    }

    if (!msg.customDesign) {
      const customDesign = getConfigValue<string | Record<string, unknown> | undefined>(
        'designCustomization',
        undefined,
        'DESIGN_CUSTOMIZATION',
      );
      if (typeof customDesign !== 'undefined') {
        try {
          msg.customDesign =
            typeof customDesign === 'object'
              ? JSON.stringify(customDesign)
              : customDesign.replace(/\s/g, '');
        } catch (e) {
          console.error(e);
        }
      }
    }
    return { ok: true };
  };
};

const defaultClientApiRoutes: Record<string, RegisteredClientApiRoute> = {
  'breakoutRoom/create': {
    endpoint: 'breakoutRoom/create',
    requestSchema: CreateBreakoutRoomsReqSchema,
    responseSchema: BreakoutRoomResSchema,
    afterSuccess: () => {
      store.dispatch(breakoutRoomApi.util.invalidateTags(['List']));
    },
  },
  'insights/transcription/configure': {
    endpoint: 'insights/transcription/configure',
    requestSchema: InsightsTranscriptionConfigReqSchema,
    responseSchema: CommonResponseSchema,
  },
  'insights/transcription/end': {
    endpoint: 'insights/transcription/end',
    responseSchema: CommonResponseSchema,
  },
  'insights/translation/chat/configure': {
    endpoint: 'insights/translation/chat/configure',
    requestSchema: InsightsChatTranslationConfigReqSchema,
    responseSchema: CommonResponseSchema,
  },
  'insights/translation/chat/end': {
    endpoint: 'insights/translation/chat/end',
    responseSchema: CommonResponseSchema,
  },
  'insights/ai/meetingSummarization/configure': {
    endpoint: 'insights/ai/meetingSummarization/configure',
    requestSchema: InsightsAIMeetingSummarizationConfigReqSchema,
    responseSchema: CommonResponseSchema,
  },
  'insights/ai/meetingSummarization/end': {
    endpoint: 'insights/ai/meetingSummarization/end',
    responseSchema: CommonResponseSchema,
  },
  recording: {
    endpoint: 'recording',
    requestSchema: RecordingReqSchema,
    responseSchema: CommonResponseSchema,
    beforeSend: recordingBeforeSend('recording'),
  },
  rtmp: {
    endpoint: 'rtmp',
    requestSchema: RecordingReqSchema,
    responseSchema: CommonResponseSchema,
    beforeSend: recordingBeforeSend('rtmp'),
  },
};

for (const [route, descriptor] of Object.entries(defaultClientApiRoutes)) {
  registerClientApiRoute(route, descriptor);
}

export const CLIENT_API_SUBMIT_TOOL = 'client_api_submit';

const parsePayload = (payload: unknown): Record<string, unknown> => {
  if (typeof payload === 'string') {
    const parsed: unknown = JSON.parse(payload || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('payload must be a JSON object');
    }
    return parsed as Record<string, unknown>;
  }
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
};

export const executeClientApiSubmitTool: AIAgentToolHandler = async (args) => {
  const route = typeof args.route === 'string' ? args.route : '';
  const descriptor = clientApiRoutes.get(route);
  if (!descriptor) {
    return { ok: false, error: `Unsupported client API route: ${route}` };
  }

  // Routes without a request schema are still POSTed, with an empty body.
  let body: Uint8Array | never[] = [];
  if (descriptor.requestSchema) {
    let msg: MessageShape<DescMessage>;
    try {
      msg = fromJson(descriptor.requestSchema, parsePayload(args.payload) as JsonValue, {
        ignoreUnknownFields: true,
      });
    } catch (e) {
      return { ok: false, error: `Invalid payload for "${route}": ${(e as Error).message}` };
    }

    const check = descriptor.beforeSend?.(msg);
    if (check && check.ok === false) {
      return { ok: false, error: check.error };
    }
    body = toBinary(descriptor.requestSchema, msg);
  }

  const raw = await sendAPIRequest(
    descriptor.endpoint,
    body,
    false,
    'application/protobuf',
    'arraybuffer',
  );

  const apiError = getPnmApiError(raw);
  if (apiError) {
    return { ok: false, error: apiError.msg || 'API request failed' };
  }

  const res = fromBinary(
    descriptor.responseSchema ?? CommonResponseSchema,
    new Uint8Array(raw as ArrayBuffer | Uint8Array),
  ) as { status?: boolean; msg?: string };

  if (!res.status) {
    return { ok: false, error: res.msg || 'API request failed' };
  }
  descriptor.afterSuccess?.();
  return { ok: true, msg: res.msg || 'ok' };
};

/** Registers the client API tools. Called once from the dispatcher. */
export const registerClientApiTools = () => {
  registerAIAgentToolHandler(CLIENT_API_SUBMIT_TOOL, executeClientApiSubmitTool);
};
