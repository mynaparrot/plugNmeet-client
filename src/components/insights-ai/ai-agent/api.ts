import { create, fromBinary, MessageInitShape, toBinary } from '@bufbuild/protobuf';
import {
  AIAgentPauseReqSchema,
  AIAgentResumeReqSchema,
  AIAgentStartReqSchema,
  AIAgentStateMsg,
  AIAgentStatusReqSchema,
  AIAgentStatusResSchema,
  AIAgentStopReqSchema,
  AIAgentRuntimeState,
} from 'plugnmeet-protocol-js';

import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { getPnmApiError } from '../../../helpers/api/apiError';

export interface AIAgentApiResult {
  status: boolean;
  // i18n key when the server rejected the request
  msg: string;
  state?: AIAgentStateMsg;
}

/** Posts a protobuf request and decodes the AIAgentStatusRes body. */
const post = async (path: string, body: Uint8Array): Promise<AIAgentApiResult> => {
  const r = await sendAPIRequest(
    `aiAgent/${path}`,
    body,
    false,
    'application/protobuf',
    'arraybuffer',
  );

  // failed requests carry a CommonResponse instead of the endpoint's schema
  const apiError = getPnmApiError(r);
  if (apiError) {
    return { status: false, msg: apiError.msg };
  }

  const res = fromBinary(AIAgentStatusResSchema, new Uint8Array(r));
  return { status: res.status, msg: res.msg, state: res.state };
};

const encode = <Desc extends Parameters<typeof toBinary>[0]>(
  schema: Desc,
  init: MessageInitShape<Desc>,
) => toBinary(schema, create(schema, init));

/** Starts the agent; empty fields fall back to the room's AI agent features. */
export const startAIAgent = (req: MessageInitShape<typeof AIAgentStartReqSchema> = {}) =>
  post('start', encode(AIAgentStartReqSchema, req));

export const stopAIAgent = (reason?: string) =>
  post('stop', encode(AIAgentStopReqSchema, reason ? { reason } : {}));

export const pauseAIAgent = () => post('pause', encode(AIAgentPauseReqSchema, {}));

export const resumeAIAgent = () => post('resume', encode(AIAgentResumeReqSchema, {}));

export const getAIAgentStatus = () => post('status', encode(AIAgentStatusReqSchema, {}));

/** True when the response means "a live agent session exists". */
export const isAIAgentLiveState = (state?: AIAgentStateMsg): state is AIAgentStateMsg =>
  !!state &&
  state.state !== AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_STOPPED &&
  state.state !== AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_UNSPECIFIED;
