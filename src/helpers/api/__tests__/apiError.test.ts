import { describe, expect, it } from 'vitest';
import { create, toBinary } from '@bufbuild/protobuf';
import { CommonResponseSchema, StatusCode } from 'plugnmeet-protocol-js';

import {
  decodeCommonResponseBody,
  getPnmApiError,
  isPnmApiError,
  toPnmApiError,
  UNKNOWN_ERROR_MSG_KEY,
  wrapPnmApiErrorBytes,
} from '../apiError';

const commonResponseBytes = (msg: string, statusCode: StatusCode) =>
  toBinary(CommonResponseSchema, create(CommonResponseSchema, { status: false, msg, statusCode }));

describe('toPnmApiError', () => {
  it('decodes a protobuf CommonResponse body', () => {
    const body = commonResponseBytes('notifications.room-not-found', StatusCode.ROOM_NOT_FOUND);

    expect(toPnmApiError(404, body)).toEqual({
      status: false,
      msg: 'notifications.room-not-found',
      statusCode: StatusCode.ROOM_NOT_FOUND,
      httpStatus: 404,
    });
  });

  it('decodes an ArrayBuffer body', () => {
    const body = commonResponseBytes(
      'notifications.permission-denied',
      StatusCode.PERMISSION_DENIED,
    );

    const apiError = toPnmApiError(403, body.buffer);

    expect(apiError.msg).toBe('notifications.permission-denied');
    expect(apiError.statusCode).toBe(StatusCode.PERMISSION_DENIED);
  });

  it('decodes a protojson body with snake_case keys', () => {
    const apiError = toPnmApiError(409, {
      status: false,
      msg: 'notifications.room-not-active',
      status_code: StatusCode.ROOM_NOT_ACTIVE,
    });

    expect(apiError.msg).toBe('notifications.room-not-active');
    expect(apiError.statusCode).toBe(StatusCode.ROOM_NOT_ACTIVE);
    expect(apiError.httpStatus).toBe(409);
  });

  it('decodes a JSON string body with camelCase keys', () => {
    const apiError = toPnmApiError(
      401,
      JSON.stringify({
        msg: 'notifications.not-valid',
        statusCode: StatusCode.INVALID_TOKEN_OR_SIGNATURE,
      }),
    );

    expect(apiError.msg).toBe('notifications.not-valid');
    expect(apiError.statusCode).toBe(StatusCode.INVALID_TOKEN_OR_SIGNATURE);
  });

  it('decodes protojson enum names', () => {
    const snakeCase = toPnmApiError(409, {
      status: false,
      msg: 'notifications.room-not-active',
      status_code: 'ROOM_NOT_ACTIVE',
    });

    expect(snakeCase.msg).toBe('notifications.room-not-active');
    expect(snakeCase.statusCode).toBe(StatusCode.ROOM_NOT_ACTIVE);

    const camelCase = toPnmApiError(
      401,
      JSON.stringify({
        msg: 'notifications.not-valid',
        statusCode: 'INVALID_TOKEN_OR_SIGNATURE',
      }),
    );

    expect(camelCase.statusCode).toBe(StatusCode.INVALID_TOKEN_OR_SIGNATURE);
  });

  it('ignores an unknown status code name', () => {
    const apiError = toPnmApiError(500, {
      msg: 'notifications.error-occurred',
      status_code: 'NOT_A_STATUS_CODE',
    });

    expect(apiError.statusCode).toBe(StatusCode.UNKNOWN_STATUS);
    expect(apiError.msg).toBe('notifications.error-occurred');
  });

  it('decodes a JSON body received as raw bytes', () => {
    const body = new TextEncoder().encode(
      JSON.stringify({
        status: false,
        msg: 'notifications.room-not-found',
        status_code: StatusCode.ROOM_NOT_FOUND,
      }),
    );

    const apiError = toPnmApiError(404, body);

    expect(apiError.msg).toBe('notifications.room-not-found');
    expect(apiError.statusCode).toBe(StatusCode.ROOM_NOT_FOUND);
  });

  it('falls back to a generic i18n key when the body carries no message', () => {
    for (const body of [undefined, null, new Uint8Array(), '', 'not-json', {}]) {
      const apiError = toPnmApiError(500, body);
      expect(apiError.msg).toBe(UNKNOWN_ERROR_MSG_KEY);
      expect(apiError.statusCode).toBe(StatusCode.UNKNOWN_STATUS);
      expect(apiError.httpStatus).toBe(500);
    }
  });

  it('never reports a success HTTP status', () => {
    expect(toPnmApiError(200, undefined).httpStatus).toBe(0);
    expect(toPnmApiError(0, undefined).httpStatus).toBe(0);
  });
});

describe('getPnmApiError', () => {
  const apiError = {
    status: false as const,
    msg: 'notifications.room-not-found',
    statusCode: StatusCode.ROOM_NOT_FOUND,
    httpStatus: 404,
  };

  it('detects the JSON envelope', () => {
    expect(isPnmApiError(apiError)).toBe(true);
    expect(getPnmApiError(apiError)).toEqual(apiError);
  });

  it('detects a protobuf failure body and still decodes as CommonResponse', () => {
    const bytes = wrapPnmApiErrorBytes(apiError);

    expect(getPnmApiError(bytes)).toEqual(apiError);
    expect(isPnmApiError(bytes)).toBe(false);
    // legacy consumers keep decoding the body as a CommonResponse
    expect(decodeCommonResponseBody(bytes)).toEqual({
      msg: 'notifications.room-not-found',
      statusCode: StatusCode.ROOM_NOT_FOUND,
    });
  });

  it('ignores successful payloads', () => {
    const success = toBinary(
      CommonResponseSchema,
      create(CommonResponseSchema, { status: true, msg: 'notifications.success' }),
    );

    expect(getPnmApiError(success)).toBeUndefined();
    expect(getPnmApiError(undefined)).toBeUndefined();
    expect(getPnmApiError({ status: true, msg: 'ok' })).toBeUndefined();
  });
});
