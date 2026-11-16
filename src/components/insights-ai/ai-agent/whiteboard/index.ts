import { registerAIAgentToolHandler, type AIAgentToolHandler } from '../toolDispatcher';
import { hydrateAgentHistory } from './agentHistory';
import { executeWhiteboardCaptureSnapshotTool } from './snapshotCapture';
import { executeWhiteboardDrawDiagramTool } from './tools/drawDiagramTool';
import { executeWhiteboardDrawFreehandSvgTool } from './tools/drawFreehandSvgTool';
import { executeWhiteboardDrawShapesTool } from './tools/drawShapesTool';
import { executeWhiteboardLaserPointTool } from './tools/laserPointTool';
import { executeWhiteboardManageBoardTool } from './tools/manageBoardTool';
import { executeWhiteboardWriteContentTool } from './tools/writeContentTool';

/** Tool names match `b-server/pkg/services/insights/mcp/tools_client_specs.go`. */
export const WHITEBOARD_AGENT_TOOLS: Record<string, AIAgentToolHandler> = {
  whiteboard_write_content: executeWhiteboardWriteContentTool,
  whiteboard_draw_shapes: executeWhiteboardDrawShapesTool,
  whiteboard_draw_freehand_svg: executeWhiteboardDrawFreehandSvgTool,
  whiteboard_draw_diagram: executeWhiteboardDrawDiagramTool,
  whiteboard_laser_point: executeWhiteboardLaserPointTool,
  whiteboard_manage_board: executeWhiteboardManageBoardTool,
  whiteboard_capture_snapshot: executeWhiteboardCaptureSnapshotTool,
};

/** Registers the whiteboard tools. Called once from the dispatcher. */
export const registerWhiteboardAgentTools = () => {
  for (const [name, handler] of Object.entries(WHITEBOARD_AGENT_TOOLS)) {
    registerAIAgentToolHandler(name, handler);
  }
  // Restore the undo history saved by the previous page load.
  void hydrateAgentHistory();
};
