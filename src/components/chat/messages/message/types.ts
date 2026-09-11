import { ChatMessage } from 'plugnmeet-protocol-js';

export interface IChatBubbleContext {
  chatKey: string;
  currentUserId: string;
  isAdmin: boolean;
  onEditStart: () => void;
  onJumpQuote?: (id: string) => void;
}

export interface IBubbleProps extends IChatBubbleContext {
  body: ChatMessage;
}

export interface IReplyQuoteProps {
  replyToId?: string;
  replyToName?: string;
  replyToText?: string;
  chatKey: string;
  onJump?: (id: string) => void;
}

export type IMessageActionsProps = Pick<
  IBubbleProps,
  'body' | 'chatKey' | 'currentUserId' | 'isAdmin' | 'onEditStart'
>;
