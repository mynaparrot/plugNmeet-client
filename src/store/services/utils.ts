import { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { requestToRenewPnmToken } from '../../helpers/api/plugNmeetAPI';
import { fromBinary, toJson } from '@bufbuild/protobuf';

export function renewTokenOnError(response: FetchBaseQueryError) {
  if (
    // @ts-expect-error this value exists
    typeof response.originalStatus !== 'undefined' &&
    // @ts-expect-error this value exists
    response.originalStatus === 401
  ) {
    console.info(`Got status: 401, trying to renew token.`);
    requestToRenewPnmToken();
  }
}

export const handleProtobufResponse =
  (schema: any) => async (res: Response) => {
    const buf = await res.arrayBuffer();
    const binary = fromBinary(schema, new Uint8Array(buf));
    return toJson(schema, binary);
  };
