import { useAppSelector } from '../../../store';

// Same client-readable gating as the notepad/whiteboard AI features.
const useIsPollAIEnabled = (): boolean => {
  const aiTextChatFeatures = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures?.aiFeatures
        ?.aiTextChatFeatures,
  );
  const currentUser = useAppSelector((state) => state.session.currentUser);

  return (
    !!aiTextChatFeatures?.isEnabled &&
    !aiTextChatFeatures?.isPollAiDisabled &&
    (aiTextChatFeatures?.isAllowedEveryone ||
      (aiTextChatFeatures?.allowedUserIds ?? []).includes(currentUser?.userId ?? ''))
  );
};

export default useIsPollAIEnabled;
