import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { CommonResponseSchema, StatusCode } from 'plugnmeet-protocol-js';

/**
 * i18n key used when the server did not send a usable message.
 */
export const UNKNOWN_ERROR_MSG_KEY = 'notifications.error-occurred';

/**
 * Normalized failure of an API request.
 *
 * Failed requests always have a non-2xx HTTP status and a CommonResponse body,
 * so `msg` is an i18n key (when sent by the server) and `statusCode` is the
 * protocol status code of the failure.
 */
export interface PnmApiError {
  status: false;
  msg: string;
  statusCode: StatusCode;
  /** HTTP status of the failed request, 0 when no response was received. */
  httpStatus: number;
}

/**
 * Failure body of a protobuf endpoint. It stays a CommonResponse binary, so
 * consumers that only need `msg` keep decoding it as before; typed consumers use
 * `getPnmApiError` to detect the failure before decoding their success schema.
 */
export type PnmApiErrorBytes = Uint8Array & { apiError: PnmApiError };

export const isPnmApiError = (res: unknown): res is PnmApiError => {
  if (typeof res !== 'object' || res === null) return false;
  const value = res as Partial<PnmApiError>;
  return (
    value.status === false && typeof value.msg === 'string' && typeof value.httpStatus === 'number'
  );
};

/**
 * Returns the API failure carried by `res`, if any. Handles both the JSON
 * envelope and the protobuf error body.
 */
export const getPnmApiError = (res: unknown): PnmApiError | undefined => {
  if (isPnmApiError(res)) {
    return res;
  }
  if (res instanceof Uint8Array) {
    return (res as PnmApiErrorBytes).apiError;
  }
  return undefined;
};

export const wrapPnmApiErrorBytes = (apiError: PnmApiError): PnmApiErrorBytes => {
  const res = create(CommonResponseSchema, {
    status: false,
    msg: apiError.msg,
    statusCode: apiError.statusCode,
  });
  const bytes = toBinary(CommonResponseSchema, res) as PnmApiErrorBytes;
  bytes.apiError = apiError;
  return bytes;
};

/**
 * Resolves a status code from a JSON body. protojson encodes enums as their
 * symbolic name (e.g. `"ROOM_NOT_ACTIVE"`), plain JSON may carry the number.
 */
const toStatusCode = (value: unknown): StatusCode | undefined => {
  if (typeof value === 'number') {
    return value as StatusCode;
  }
  if (typeof value === 'string') {
    // the generated enum is a numeric TS enum, so names map back to values
    const code = StatusCode[value as keyof typeof StatusCode];
    if (typeof code === 'number') {
      return code;
    }
  }
  return undefined;
};

/**
 * Decodes a CommonResponse failure body. Accepts the protobuf body, a JSON
 * string, or already parsed JSON (the server emits protojson, so `status_code`
 * with the enum name).
 */
export const decodeCommonResponseBody = (
  body: unknown,
): { msg?: string; statusCode?: StatusCode } | undefined => {
  if (!body) {
    return undefined;
  }
  if (body instanceof ArrayBuffer) {
    return decodeCommonResponseBody(new Uint8Array(body));
  }
  if (body instanceof Uint8Array) {
    if (!body.byteLength) {
      return undefined;
    }
    try {
      const res = fromBinary(CommonResponseSchema, body);
      if (res.msg || res.statusCode !== StatusCode.UNKNOWN_STATUS) {
        return { msg: res.msg, statusCode: res.statusCode };
      }
    } catch {
      // not a protobuf body, fall through and try it as JSON text
    }
    return decodeCommonResponseBody(new TextDecoder().decode(body));
  }
  if (typeof body === 'string') {
    try {
      return decodeCommonResponseBody(JSON.parse(body));
    } catch {
      return undefined;
    }
  }
  if (typeof body === 'object') {
    const value = body as { msg?: unknown; status_code?: unknown; statusCode?: unknown };
    const code = toStatusCode(value.status_code) ?? toStatusCode(value.statusCode);
    if (typeof value.msg !== 'string' && code === undefined) {
      return undefined;
    }
    return {
      msg: typeof value.msg === 'string' ? value.msg : undefined,
      statusCode: code as StatusCode | undefined,
    };
  }
  return undefined;
};

/**
 * Builds the normalized failure for a request. Never leaks transport errors
 * (axios messages, raw bodies) to the caller.
 */
export const toPnmApiError = (httpStatus: number, body?: unknown): PnmApiError => {
  const decoded = decodeCommonResponseBody(body);
  return {
    status: false,
    msg: decoded?.msg || UNKNOWN_ERROR_MSG_KEY,
    statusCode: decoded?.statusCode ?? StatusCode.UNKNOWN_STATUS,
    // only a real failed HTTP status is reported, never a success one
    httpStatus: httpStatus >= 400 ? httpStatus : 0,
  };
};
