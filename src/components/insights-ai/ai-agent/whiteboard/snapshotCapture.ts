import { create, toJsonString } from '@bufbuild/protobuf';
import type { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import {
  AIAgentWhiteboardSceneMsgSchema,
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
} from 'plugnmeet-protocol-js';

import { getNatsConn } from '../../../../helpers/nats';
import { store } from '../../../../store';
import { getWhiteboardController } from '../../../whiteboard/collab';
import { getWhiteboardExcalidrawAPI } from '../../../whiteboard/helpers/liveScene';
import { ensureWhiteboardSurface } from './boardSession';
import {
  buildWhiteboardSceneGraph,
  type SceneGraphElement,
  type SceneScope,
  type SceneViewport,
  type WhiteboardScene,
} from './sceneGraph';

export const DEFAULT_VISION_MAX_EDGE_PX = 1024;
export const MIN_VISION_MAX_EDGE_PX = 512;
export const MAX_VISION_MAX_EDGE_PX = 1600;
const VISION_QUALITY = 0.72;
/** Bigger than this and the image is dropped rather than pushed. */
const MAX_SNAPSHOT_BYTES = 400 * 1024;

export type WhiteboardSnapshot = {
  ok: boolean;
  reason: string;
  fileId: string;
  page: number;
  scene: WhiteboardScene;
  imageBytes: number;
  error?: string;
};

const clampMaxEdge = (value: unknown): number => {
  const px = Number(value);
  if (!Number.isFinite(px) || px <= 0) {
    return DEFAULT_VISION_MAX_EDGE_PX;
  }
  return Math.min(MAX_VISION_MAX_EDGE_PX, Math.max(MIN_VISION_MAX_EDGE_PX, Math.round(px)));
};

const viewportOf = (api: ExcalidrawImperativeAPI | null): SceneViewport | undefined => {
  if (!api) {
    return undefined;
  }
  const appState = api.getAppState();
  const zoom = appState.zoom?.value || 1;
  return {
    x: Math.round(-appState.scrollX / zoom),
    y: Math.round(-appState.scrollY / zoom),
    width: Math.round(appState.width / zoom),
    height: Math.round(appState.height / zoom),
    zoom,
  };
};

const canvasToWebp = async (canvas: HTMLCanvasElement | OffscreenCanvas): Promise<Uint8Array> => {
  const blob =
    'convertToBlob' in canvas
      ? await canvas.convertToBlob({ type: 'image/webp', quality: VISION_QUALITY })
      : await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((result) => resolve(result), 'image/webp', VISION_QUALITY);
        });

  return blob ? new Uint8Array(await blob.arrayBuffer()) : new Uint8Array();
};

/**
 * Renders the page to a small WebP. Returns an empty array whenever the
 * environment cannot render (headless DOM, no canvas): the scene graph alone is
 * still worth sending.
 */
const renderWebp = async (
  api: ExcalidrawImperativeAPI,
  elements: readonly NonDeletedExcalidrawElement[],
  maxEdgePx: number,
  withFiles: boolean,
): Promise<Uint8Array> => {
  try {
    const { exportScene } = await import('@excalidraw/excalidraw');
    const canvas = await exportScene({
      type: 'canvas',
      data: {
        elements,
        appState: { viewBackgroundColor: api.getAppState().viewBackgroundColor } as never,
        files: withFiles ? api.getFiles() : null,
      },
      config: {
        theme: 'light',
        canvasBackgroundColor: '#ffffff',
        padding: 8,
        maxWidthOrHeight: maxEdgePx,
      },
    });
    return await canvasToWebp(canvas);
  } catch (e) {
    console.warn('[AIAgentWhiteboard] snapshot render failed; sending the scene graph only', e);
    return new Uint8Array();
  }
};

const captureImage = async (
  api: ExcalidrawImperativeAPI | null,
  elements: readonly NonDeletedExcalidrawElement[],
  maxEdgePx: number,
): Promise<Uint8Array> => {
  if (!api || elements.length === 0 || typeof document === 'undefined') {
    return new Uint8Array();
  }

  const image = await renderWebp(api, elements, maxEdgePx, true);
  if (image.byteLength > 0 && image.byteLength <= MAX_SNAPSHOT_BYTES) {
    return image;
  }
  // Huge embedded images: retry without the binaries before giving up.
  const withoutFiles =
    image.byteLength > 0 ? await renderWebp(api, elements, maxEdgePx, false) : image;
  return withoutFiles.byteLength <= MAX_SNAPSHOT_BYTES ? withoutFiles : new Uint8Array();
};

export type WhiteboardSnapshotOptions = {
  maxEdgePx?: unknown;
  scope?: SceneScope;
  /** `false` keeps a tool call metadata-only; automatic syncs render by default. */
  includeImage?: boolean;
};

const aiAgentFeatures = () =>
  store.getState().session.currentRoom.metadata?.roomFeatures?.insightsFeatures?.aiAgentFeatures;

/**
 * Captures the scene graph (and, unless disabled, the WebP) of the active page
 * and hands both to `b-server` in one message, so the model's picture and
 * coordinates always describe the same moment.
 */
export const captureWhiteboardSnapshot = async (
  reason: string,
  options: WhiteboardSnapshotOptions = {},
): Promise<WhiteboardSnapshot> => {
  const controller = getWhiteboardController();
  const api = getWhiteboardExcalidrawAPI();
  const snapshot = controller.getSnapshot();
  const state = store.getState();

  const fileId = snapshot?.fileId ?? state.whiteboard.currentWhiteboardOfficeFileId;
  const page = snapshot?.page ?? state.whiteboard.currentPage;
  const elements = (
    api ? api.getSceneElements() : controller.getElements().filter((element) => !element.isDeleted)
  ) as readonly NonDeletedExcalidrawElement[];

  const scope: SceneScope = options.scope === 'viewport' ? 'viewport' : 'full_canvas';
  const scene = buildWhiteboardSceneGraph(elements, fileId, page, viewportOf(api), scope);

  // Metadata always travels; pixels only when the room allows them and the
  // caller did not opt out.
  const includeImage =
    options.includeImage !== false && aiAgentFeatures()?.allowVisionCapture !== false;
  const image = includeImage
    ? await captureImage(api, elements, clampMaxEdge(options.maxEdgePx))
    : new Uint8Array();

  const conn = getNatsConn();
  if (!conn) {
    return {
      ok: false,
      reason,
      fileId,
      page,
      scene,
      imageBytes: image.byteLength,
      error: 'Not connected to the room.',
    };
  }

  const message = create(AIAgentWhiteboardSceneMsgSchema, {
    roomId: state.session.currentRoom.roomId,
    fileId,
    page,
    reason,
    // The bytes travel in `binMsg`; protojson would inflate them to base64.
    webpImage: new Uint8Array(),
    sceneGraphJson: JSON.stringify(scene.graph),
    capturedAtMs: String(Date.now()),
    participantElementIds: scene.participantElementIds,
    agentElementIds: scene.agentElementIds,
  });

  void conn.sendMessageToSystemWorker(
    create(NatsMsgClientToServerSchema, {
      event: NatsMsgClientToServerEvents.AI_AGENT_WHITEBOARD_SCENE,
      msg: toJsonString(AIAgentWhiteboardSceneMsgSchema, message),
      binMsg: image,
    }),
  );

  return { ok: true, reason, fileId, page, scene, imageBytes: image.byteLength };
};

const sceneSummary = (element: SceneGraphElement) => ({
  id: element.id,
  type: element.type,
  text: element.text,
  x: element.x,
  y: element.y,
  width: element.width,
  height: element.height,
  ...(element.font_size ? { font_size: element.font_size } : {}),
  ...(element.stroke_color ? { stroke_color: element.stroke_color } : {}),
  ...(element.words && element.words.length > 0 ? { words: element.words } : {}),
  ...(element.bound ? { bound: element.bound } : {}),
});

/**
 * `whiteboard_capture_snapshot` client tool: metadata-first inspection.
 * Vision capture being disabled only removes the image, never the inspection.
 */
export const executeWhiteboardCaptureSnapshotTool = async (
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const features = aiAgentFeatures();
  const scope: SceneScope = args.scope === 'full_canvas' ? 'full_canvas' : 'viewport';
  const includeImage = args.include_image === true && features?.allowVisionCapture !== false;

  // The model is looking at the board, so the room should be looking at it too.
  const boardError = await ensureWhiteboardSurface();
  if (boardError) {
    return { ok: false, element_count: 0, error: boardError };
  }

  const reason = args.reason === 'page_change' ? 'page_change' : 'tool_request';
  const result = await captureWhiteboardSnapshot(reason, {
    maxEdgePx: args.max_edge_px,
    scope,
    includeImage,
  });
  if (!result.ok) {
    return { ok: false, element_count: result.scene.graph.counts.total, error: result.error };
  }

  const graph = result.scene.graph;
  return {
    ok: true,
    element_count: graph.counts.total,
    participant_count: graph.counts.participant,
    agent_count: graph.counts.agent,
    scope: graph.scope,
    page_bounds: graph.page_bounds,
    ...(graph.viewport ? { viewport: graph.viewport } : {}),
    include_image: includeImage && result.imageBytes > 0,
    participant_elements: graph.elements
      .filter((element) => element.author === 'participant')
      .map(sceneSummary),
    agent_elements: graph.elements
      .filter((element) => element.author === 'agent')
      .map(sceneSummary),
    image_bytes: result.imageBytes,
    page: result.page,
    file_id: result.fileId,
  };
};
