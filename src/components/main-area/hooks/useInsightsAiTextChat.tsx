import { useMemo } from 'react';

import { useAppSelector } from '../../../store';
import InsightsAiTextChat from '../../insights-ai/ai-text-chat/display';

export const useInsightsAiTextChat = () => {
  const isEnabled = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures
        ?.aiFeatures?.aiTextChatFeatures?.isEnabled,
  );

  return useMemo(() => {
    if (isEnabled) {
      return <InsightsAiTextChat />;
    }
    return null;
  }, [isEnabled]);
};
