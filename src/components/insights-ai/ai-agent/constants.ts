/** LiveKit identity prefix the server uses for the AI agent participant. */
export const AI_AGENT_USER_ID_PREFIX = 'pnm_agent-ai_agent-';

export const isAIAgentUserId = (userId: string, agentUserId?: string): boolean => {
  if (agentUserId && userId === agentUserId) {
    return true;
  }
  return !!userId && userId.startsWith(AI_AGENT_USER_ID_PREFIX);
};
