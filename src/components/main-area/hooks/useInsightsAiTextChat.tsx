import React, { Suspense, useMemo } from 'react';

import { useAppSelector } from '../../../store';
import { selectIsInsightsAiTextChatEnabled } from '../../insights-ai/featureGate';

const InsightsAiTextChat = React.lazy(() => import('../../insights-ai/ai-text-chat/display'));

export const useInsightsAiTextChat = () => {
  const isEnabled = useAppSelector(selectIsInsightsAiTextChatEnabled);

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
