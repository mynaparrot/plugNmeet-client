import { handleAIAgentToolCall } from '../../components/insights-ai/ai-agent/toolDispatcher';
import { applyAIAgentStateJson } from '../../components/insights-ai/ai-agent/agentState';

/**
 * AI agent events transport. State updates land in Redux; tool calls are
 * handed to the client dispatcher, which replies on its own.
 */
export default class HandleAIAgent {
  public handleState = (msg: string) => {
    applyAIAgentStateJson(msg);
  };

  public handleToolCall = (msg: string) => handleAIAgentToolCall(msg);
}
