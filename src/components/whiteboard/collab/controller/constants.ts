/** Timing and limit knobs for the whiteboard collab controller. */

/** Yjs update origin for everything that arrives from the room. */
export const WHITEBOARD_REMOTE_ORIGIN = 'whiteboard-remote';

/** Ranked peers a sync run may cycle through. */
export const MAX_SYNC_REQUEST_TARGETS = 3;
export const INITIAL_REQUEST_RETRY_MS = 500;
export const INITIAL_REQUEST_TIMEOUT_MS = 4000;
export const MISSING_UPDATE_RESYNC_THROTTLE_MS = 2000;
/** Per-peer throttle for pointing a peer that is stuck on a stale scope at the live one. */
export const STALE_PEER_NUDGE_THROTTLE_MS = 2000;
// Stop firing targeted resyncs for a gap that never heals; anti-entropy still
// covers it at one peer per tick.
export const MAX_MISSING_UPDATE_RESYNCS = 5;
export const ANTI_ENTROPY_INTERVAL_MS = 25000;
export const ANTI_ENTROPY_JITTER_MS = 5000;
/** Total time a page/file switch may spend flushing the active page. */
export const SAVE_FLUSH_TIMEOUT_MS = 5000;
/** Pause between flush attempts so an instantly failing save cannot spin. */
export const SAVE_FLUSH_RETRY_DELAY_MS = 500;
