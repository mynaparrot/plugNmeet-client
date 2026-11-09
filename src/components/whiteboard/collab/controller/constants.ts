/** Timing and limit knobs for the whiteboard collab controller. */

/** Yjs update origin for everything that arrives from the room. */
export const WHITEBOARD_REMOTE_ORIGIN = 'whiteboard-remote';

export const SYNC_RETRY_DELAY_MS = 2000;
export const MAX_SYNC_REQUEST_ATTEMPTS = 3;
/** Peers asked for a sync per request. */
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
/** Backup responders wait a random slice of this window so only one peer answers. */
export const BACKUP_RESPONDER_MIN_DELAY_MS = 250;
export const BACKUP_RESPONDER_JITTER_MS = 550;
