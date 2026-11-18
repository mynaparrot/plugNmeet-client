import { useEffect, useState } from 'react';

import type { IAIAgentState } from '../../../../store/slices/interfaces/aiAgent';
import { formatAIAgentElapsed } from './statusModel';

/**
 * Ticking "connected" timer for a running agent, or `null` when there is
 * nothing to count. One interval per mounted consumer; the value only changes
 * once a second so it stays cheap.
 */
export const useAIAgentElapsedTime = (
  agent: IAIAgentState | null,
  isRunning: boolean,
): string | null => {
  const startedAt = agent?.startedAt;
  const hasStarted = isRunning && !!startedAt && startedAt > 0;

  const [elapsed, setElapsed] = useState<string | null>(() =>
    hasStarted ? formatAIAgentElapsed(startedAt, Date.now()) : null,
  );

  useEffect(() => {
    if (!hasStarted) {
      setElapsed(null);
      return;
    }
    setElapsed(formatAIAgentElapsed(startedAt, Date.now()));
    const timer = setInterval(() => {
      setElapsed(formatAIAgentElapsed(startedAt, Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStarted, startedAt]);

  return elapsed;
};

export default useAIAgentElapsedTime;
