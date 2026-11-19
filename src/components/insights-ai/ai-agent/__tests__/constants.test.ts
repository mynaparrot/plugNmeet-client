import { describe, expect, it } from 'vitest';

import { AI_AGENT_USER_ID_PREFIX, isAIAgentUserId } from '../constants';

describe('isAIAgentUserId', () => {
  it('matches the server agent identity prefix', () => {
    expect(isAIAgentUserId(`${AI_AGENT_USER_ID_PREFIX}session-1`)).toBe(true);
  });

  it('matches an explicit agent user id', () => {
    expect(isAIAgentUserId('agent-1', 'agent-1')).toBe(true);
    expect(isAIAgentUserId('someone-else', 'agent-1')).toBe(false);
  });

  it('rejects regular participants and empty ids', () => {
    expect(isAIAgentUserId('user-1')).toBe(false);
    expect(isAIAgentUserId('user-1', 'agent-1')).toBe(false);
    expect(isAIAgentUserId('')).toBe(false);
  });
});
