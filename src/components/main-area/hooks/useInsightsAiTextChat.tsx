import React, { Suspense, useMemo } from 'react';

import { useAppSelector } from '../../../store';

const InsightsAiTextChat = React.lazy(() => import('../../insights-ai/ai-text-chat/display'));

export const useInsightsAiTextChat = () => {
  const isEnabled = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures?.aiFeatures
        ?.aiTextChatFeatures?.isEnabled,
  );

  return useMemo(() => {
    if (isEnabled) {
      return (
        <Suspense fallback={null}>
          <InsightsAiTextChat />
        </Suspense>
      );
    }
    return null;
  }, [isEnabled]);
};
