import { describe, expect, it, vi } from 'vitest';
import { create, toBinary } from '@bufbuild/protobuf';
import {
  BreakoutRoomResSchema,
  CommonResponseSchema,
  PollResponseSchema,
  StatusCode,
} from 'plugnmeet-protocol-js';

// the handler only needs the token renewal hook, not the axios layer
vi.mock('../../../helpers/api/plugNmeetAPI', () => ({
  default: vi.fn(),
  requestToRenewPnmToken: vi.fn(),
}));

import { handleProtobufResponse } from '../utils';

describe('handleProtobufResponse', () => {
  it('decodes the typed schema for successful responses', async () => {
    const body = toBinary(
      PollResponseSchema,
      create(PollResponseSchema, { status: true, msg: 'notifications.success' }),
    );
    const res = new Response(body, {
      status: 200,
      headers: { 'content-type': 'application/protobuf' },
    });

    const data = (await handleProtobufResponse(PollResponseSchema)(res)) as {
      status: boolean;
      msg: string;
    };

    expect(data.status).toBe(true);
    expect(data.msg).toBe('notifications.success');
  });

  it('decodes a protobuf CommonResponse for failed responses', async () => {
    const body = toBinary(
      CommonResponseSchema,
      create(CommonResponseSchema, {
        status: false,
        msg: 'notifications.room-not-found',
        statusCode: StatusCode.ROOM_NOT_FOUND,
      }),
    );
    const res = new Response(body, {
      status: 404,
      headers: { 'content-type': 'application/protobuf' },
    });

    // the endpoint's success schema must not be used to decode the failure
    const data = await handleProtobufResponse(BreakoutRoomResSchema)(res);

    expect(data).toEqual({
      status: false,
      msg: 'notifications.room-not-found',
      statusCode: StatusCode.ROOM_NOT_FOUND,
    });
  });

  it('decodes a JSON CommonResponse for failed responses', async () => {
    const res = new Response(
      JSON.stringify({
        status: false,
        msg: 'notifications.permission-denied',
        status_code: StatusCode.PERMISSION_DENIED,
      }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    );

    const data = await handleProtobufResponse(BreakoutRoomResSchema)(res);

    expect(data).toEqual({
      status: false,
      msg: 'notifications.permission-denied',
      statusCode: StatusCode.PERMISSION_DENIED,
    });
  });
});
