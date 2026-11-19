import React, { Suspense, useEffect, useMemo, useRef } from 'react';

import { useAppDispatch, useAppSelector } from '../../../store';
import { updateIsActiveInsightsAiTextChat } from '../../../store/slices/bottomIconsActivitySlice';
import {
  selectIsAIAgentChatEnabled,
  selectIsInsightsAiTextChatEnabled,
} from '../../insights-ai/featureGate';

const InsightsAiTextChat = React.lazy(() => import('../../insights-ai/ai-text-chat/display'));

export const useInsightsAiTextChat = () => {
  const dispatch = useAppDispatch();
  const isEnabled = useAppSelector(selectIsInsightsAiTextChatEnabled);
  const isAgentChat = useAppSelector(selectIsAIAgentChatEnabled);
  // Open the panel once when entering a 1-on-1 AI session room; the user can close it later.
  const didAutoOpenRef = useRef(false);

  useEffect(() => {
    if (!isAgentChat || didAutoOpenRef.current) {
      return;
    }
    didAutoOpenRef.current = true;
    dispatch(updateIsActiveInsightsAiTextChat(true));
  }, [dispatch, isAgentChat]);

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
