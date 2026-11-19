/**
 * Stable id of the A4 boundary guide rectangle. The guide is presenter-only
 * chrome and never enters the CRDT, so anything scanning the scene has to
 * filter it out by id.
 */
export const A4_BOUNDARY_GUIDE_ID = 'a4-boundary-guide-id';

/**
 * Stable id of the invisible 1×1 rectangle the AI agent writes to prove the
 * canvas is paint-ready. Like the A4 guide it is local chrome and never enters
 * the CRDT.
 */
export const WHITEBOARD_READY_PROBE_ID = '__pnm_wb_ready_probe__';
