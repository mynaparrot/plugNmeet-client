import { DataMsgBodyType } from 'plugnmeet-protocol-js';

/**
 * Custom data-channel message types that are not part of the upstream
 * plugnmeet-protocol-js enum. proto3 enums are open, so unknown numeric
 * values survive encode/decode on every client without protocol or
 * server changes. Values start at 100 to stay clear of upstream additions.
 */
export const CUSTOM_DATA_MSG_TYPES = {
  DELETE_CHAT_MESSAGE: 100 as DataMsgBodyType,
} as const;
