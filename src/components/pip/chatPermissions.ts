export interface IChatLockSettings {
  lockChat?: boolean;
  lockChatSendMessage?: boolean;
}

interface IChatPermissionArgs {
  isRecorder: boolean;
  isAdmin: boolean;
  lockChat?: boolean;
  lockChatSendMessage?: boolean;
  defaultLockSettings?: IChatLockSettings;
}

/**
 * Same rules as the chat panel: recorders can never send, admins always can,
 * and for everyone else a user-specific lock override beats the room default.
 */
export const canSendPublicChatMessage = ({
  isRecorder,
  isAdmin,
  lockChat,
  lockChatSendMessage,
  defaultLockSettings,
}: IChatPermissionArgs): boolean => {
  if (isRecorder) return false;
  if (isAdmin) return true;

  const chatLocked = typeof lockChat === 'undefined' ? !!defaultLockSettings?.lockChat : lockChat;
  const sendLocked =
    typeof lockChatSendMessage === 'undefined'
      ? !!defaultLockSettings?.lockChatSendMessage
      : lockChatSendMessage;

  return !chatLocked && !sendLocked;
};
