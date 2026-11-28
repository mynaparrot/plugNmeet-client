import { AIAgentRuntimeState } from 'plugnmeet-protocol-js';

import i18n from '../../../../helpers/i18n';
import type { IAIAgentState } from '../../../../store/slices/interfaces/aiAgent';

export type AIAgentStatusTone = 'idle' | 'active' | 'speaking' | 'busy' | 'paused';

export interface IAIAgentStatusLabel {
  key: string;
  tone: AIAgentStatusTone;
}

const STATE_LABELS: Record<AIAgentRuntimeState, IAIAgentStatusLabel> = {
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_UNSPECIFIED]: {
    key: 'ai-agent.state.unknown',
    tone: 'active',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_CONNECTING]: {
    key: 'ai-agent.state.connecting',
    tone: 'busy',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_LISTENING]: {
    key: 'ai-agent.state.listening',
    tone: 'active',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_THINKING]: {
    key: 'ai-agent.state.thinking',
    tone: 'busy',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_SPEAKING]: {
    key: 'ai-agent.state.speaking',
    tone: 'speaking',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_DRAWING]: {
    key: 'ai-agent.state.drawing',
    tone: 'busy',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_PAUSED]: {
    key: 'ai-agent.state.paused',
    tone: 'paused',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_RECONNECTING]: {
    key: 'ai-agent.state.reconnecting',
    tone: 'busy',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_STOPPED]: {
    key: 'ai-agent.state.stopped',
    tone: 'idle',
  },
};

export const getAIAgentStatusLabel = (state?: AIAgentRuntimeState): IAIAgentStatusLabel =>
  STATE_LABELS[state ?? AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_UNSPECIFIED];

/** A live session is anything except stopped/unspecified. */
export const isAIAgentRunning = (agent: IAIAgentState | null): boolean =>
  !!agent &&
  agent.state !== AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_STOPPED &&
  agent.state !== AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_UNSPECIFIED;

/**
 * The server can lag behind the media plane, so a listening or thinking agent
 * whose audio is still audible (or flagged as speaking) reads as speaking until
 * the track stops. A running tool keeps its own label.
 */
export const resolveAIAgentEffectiveState = (
  agent: IAIAgentState | null,
  isAgentAudioActive = false,
): AIAgentRuntimeState => {
  if (!agent) {
    return AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_UNSPECIFIED;
  }
  if (agent.state === AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_LISTENING) {
    return isAgentAudioActive || agent.isSpeaking
      ? AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_SPEAKING
      : agent.state;
  }
  if (
    agent.state === AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_THINKING &&
    isAgentAudioActive &&
    !agent.toolInProgress
  ) {
    return AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_SPEAKING;
  }
  return agent.state;
};

export const isAIAgentPaused = (agent: IAIAgentState | null): boolean =>
  agent?.state === AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_PAUSED;

export const getAIAgentDisplayName = (
  agent: IAIAgentState | null,
  configuredName?: string,
): string => agent?.agentName?.trim() || configuredName?.trim() || 'AI Assistant';

const TOOL_LABELS: Record<string, string> = {
  whiteboard_write_content: 'ai-agent.tool.writing-on-whiteboard',
  whiteboard_draw_shapes: 'ai-agent.tool.drawing-shapes',
  whiteboard_draw_freehand_svg: 'ai-agent.tool.drawing-on-whiteboard',
  whiteboard_draw_diagram: 'ai-agent.tool.drawing-diagram',
  whiteboard_laser_point: 'ai-agent.tool.pointing-on-whiteboard',
  whiteboard_manage_board: 'ai-agent.tool.updating-whiteboard',
  whiteboard_capture_snapshot: 'ai-agent.tool.reading-whiteboard',
  notepad_write: 'ai-agent.tool.writing-in-notepad',
  notepad_read: 'ai-agent.tool.reading-notepad',
  create_poll: 'ai-agent.tool.creating-poll',
  create_quiz: 'ai-agent.tool.creating-quiz',
  draft_quiz: 'ai-agent.tool.creating-quiz',
  publish_quiz: 'ai-agent.tool.creating-quiz',
  close_poll: 'ai-agent.tool.closing-poll',
  get_poll_results: 'ai-agent.tool.checking-poll-results',
  send_ai_chat_message: 'ai-agent.tool.sending-chat-message',
  publish_chat_message: 'ai-agent.tool.sending-chat-message',
  fetch_external_knowledge: 'ai-agent.tool.searching-knowledge-base',
  record_learning_progress: 'ai-agent.tool.recording-progress',
  get_room_info: 'ai-agent.tool.checking-room-info',
  set_workspace_lock: 'ai-agent.tool.updating-workspace-lock',
  manage_countdown_timer: 'ai-agent.tool.setting-timer',
  manage_external_media: 'ai-agent.tool.updating-media-player',
  manage_recording: 'ai-agent.tool.updating-recording',
  create_breakout_rooms: 'ai-agent.tool.managing-breakout-rooms',
  manage_breakout_rooms: 'ai-agent.tool.managing-breakout-rooms',
  manage_participants: 'ai-agent.tool.managing-participants',
  configure_speech_to_text: 'ai-agent.tool.configuring-transcription',
  configure_chat_translation: 'ai-agent.tool.configuring-translation',
  configure_meeting_summarization: 'ai-agent.tool.configuring-summarization',
};

/** Drops the internal `pnm_` / `ext_<server>_` namespace so only the action stays. */
const withoutToolNamespace = (tool: string): string => {
  const parts = tool.split('_');
  if (parts[0] === 'pnm') parts.shift();
  if (parts[0] === 'ext' && parts.length > 2) parts.splice(0, 2);
  return parts.join('_');
};

/**
 * Built-in tools read as an action (`whiteboard_write_content` -> `Writing on
 * whiteboard`), anything else keeps its words: `draw_shapes` -> `draw shapes`.
 * Empty when no tool is running.
 */
export const formatAIAgentToolName = (tool?: string): string => {
  const name = (tool ?? '').trim();
  if (!name) {
    return '';
  }
  const labelKey = TOOL_LABELS[name];
  if (labelKey) {
    return i18n.t(labelKey);
  }
  return withoutToolNamespace(name).replace(/[_-]+/g, ' ').trim();
};

/** States where the agent is visibly working rather than listening or talking. */
export const isAIAgentBusyState = (state?: AIAgentRuntimeState): boolean =>
  state === AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_THINKING ||
  state === AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_DRAWING ||
  state === AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_CONNECTING ||
  state === AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_RECONNECTING;

/** The running tool wins over the state label, except while the agent is talking. */
export const getAIAgentDisplayStatusText = (
  effectiveState: AIAgentRuntimeState,
  statusLabel: string,
  toolInProgress?: string,
): string => {
  const toolLabel = formatAIAgentToolName(toolInProgress);
  if (toolLabel && effectiveState !== AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_SPEAKING) {
    return toolLabel;
  }
  return statusLabel;
};

/**
 * Live "connected for" timer: `MM:SS`, switching to `HH:MM:SS` after an hour.
 * Missing or future start times read as `00:00` instead of a negative value.
 */
export const formatAIAgentElapsed = (startedAtMs?: number, nowMs: number = Date.now()): string => {
  if (!startedAtMs || startedAtMs <= 0 || nowMs < startedAtMs) {
    return '00:00';
  }
  const totalSeconds = Math.floor((nowMs - startedAtMs) / 1000);
  const pad = (value: number) => value.toString().padStart(2, '0');
  if (totalSeconds >= 3600) {
    return `${pad(Math.floor(totalSeconds / 3600))}:${pad(
      Math.floor((totalSeconds % 3600) / 60),
    )}:${pad(totalSeconds % 60)}`;
  }
  return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
};

export interface IStatusBarVisibility {
  isSessionRoom: boolean;
  /** A moderator or an authorized participant of a 1-on-1 session. */
  canControl: boolean;
  agent: IAIAgentState | null;
}

/**
 * The bar lives in AI session rooms only. Whoever may drive the session sees it
 * before a start so they can launch the agent, and again once the agent stops so
 * they can start it over; everyone else sees it once the agent is running.
 */
export const shouldShowAIAgentStatusBar = ({
  isSessionRoom,
  canControl,
  agent,
}: IStatusBarVisibility): boolean => {
  if (!isSessionRoom) {
    return false;
  }
  return canControl || isAIAgentRunning(agent);
};
