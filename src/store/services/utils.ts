import { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { requestToRenewPnmToken } from '../../helpers/api/plugNmeetAPI';
import { fromBinary, toJson } from '@bufbuild/protobuf';
import { toPnmApiError } from '../../helpers/api/apiError';

export function renewTokenOnError(response: FetchBaseQueryError) {
  const originalStatus = (response as { originalStatus?: number }).originalStatus;
  if ((originalStatus ?? response.status) === 401) {
    console.info(`Got status: 401, trying to renew token.`);
    requestToRenewPnmToken();
  }
}

export const handleProtobufResponse = (schema: any) => async (res: Response) => {
  const buf = await res.arrayBuffer();

  // failed requests carry a CommonResponse instead of the typed schema
  if (!res.ok) {
    const apiError = toPnmApiError(res.status, buf);
    return { status: false, msg: apiError.msg, statusCode: apiError.statusCode };
  }

  const binary = fromBinary(schema, new Uint8Array(buf));
  return toJson(schema, binary);
};
