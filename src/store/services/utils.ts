import { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { requestToRenewPnmToken } from '../../helpers/api/plugNmeetAPI';

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
