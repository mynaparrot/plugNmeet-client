import { A4_WIDTH, A4_HEIGHT, WorkerInput, WorkerMessage } from './types';

/**
 * Inspects the drawn canvas pixels to determine if the slice contains only background color.
 * This prevents exporting pages that are visually blank.
 */
function isSliceVisuallyBlank(
  ctx: OffscreenCanvasRenderingContext2D,
  bgColor: string,
): boolean {
  const imgData = ctx.getImageData(0, 0, A4_WIDTH, A4_HEIGHT);
  const data = imgData.data;

  // Parse bgColor to RGB (defaulting to white if parsing fails)
  let bgR = 255,
    bgG = 255,
    bgB = 255;
  if (bgColor.startsWith('#')) {
    const hex = bgColor.replace('#', '');
    if (hex.length === 3) {
      bgR = parseInt(hex[0] + hex[0], 16);
      bgG = parseInt(hex[1] + hex[1], 16);
      bgB = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      bgR = parseInt(hex.substring(0, 2), 16);
      bgG = parseInt(hex.substring(2, 4), 16);
      bgB = parseInt(hex.substring(4, 6), 16);
    }
  }

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // If there is any non-background color or semi-transparent pixel, it is not blank
    if (a > 0 && (r !== bgR || g !== bgG || b !== bgB)) {
      return false;
    }
  }
  return true;
}

async function uploadSlice(
  blob: Blob,
  sliceNumber: number,
  pageNumber: number,
  fileId: string,
  fileName: string,
  exportId: string,
  authToken: string,
  uploadUrl: string,
): Promise<void> {
  const formData = new FormData();

  formData.append('Authorization', authToken);
  formData.append('file_id', fileId);
  formData.append('file_name', fileName);
  formData.append('page_number', String(pageNumber));
  formData.append('slice_number', String(sliceNumber));
  formData.append('export_id', exportId);
  formData.append('file', blob, `${pageNumber}_${sliceNumber}.png`);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(errorText);
    throw new Error(
      `Failed to upload slice ${sliceNumber} for page ${pageNumber}`,
    );
  }
}

self.onmessage = async (event: MessageEvent<WorkerInput>) => {
  const {
    pageImageBitmap,
    appState,
    fileId,
    fileName,
    pageNumber,
    exportId,
    authToken,
    uploadUrl,
  } = event.data;

  // Epsilon tolerance threshold (in pixels) to prevent sub-pixel floating point
  // rounding anomalies from incorrectly spawning a new blank slice.
  const EPSILON = 1;
  const horizontalSlices = Math.max(
    1,
    Math.ceil((pageImageBitmap.width - EPSILON) / A4_WIDTH),
  );
  const verticalSlices = Math.max(
    1,
    Math.ceil((pageImageBitmap.height - EPSILON) / A4_HEIGHT),
  );
  const totalSlices = horizontalSlices * verticalSlices;

  // Keep elements anchored natively relative to the original document bounds.
  // This ensures that spilled content matches up perfectly with grid divisions.
  const offsetX = 0;
  const offsetY = 0;

  let sliceCount = 0;

  // Reuse a single OffscreenCanvas and Context instance to prevent
  // expensive garbage collection sweeps in the browser loop
  const sliceCanvas = new OffscreenCanvas(A4_WIDTH, A4_HEIGHT);
  const ctx = sliceCanvas.getContext('2d');
  const bgColor = appState.viewBackgroundColor || '#ffffff';

  try {
    for (let v = 0; v < verticalSlices; v++) {
      for (let h = 0; h < horizontalSlices; h++) {
        sliceCount++;
        self.postMessage({
          type: 'progress',
          payload: {
            currentPage: sliceCount,
            totalPages: totalSlices,
            pageNumber: pageNumber,
          },
          // oxlint-disable-next-line unicorn/require-post-message-target-origin
        } as WorkerMessage);

        if (!ctx) continue;

        // Clear the canvas instead of instantiating a new object
        ctx.clearRect(0, 0, A4_WIDTH, A4_HEIGHT);

        ctx.fillStyle = appState.viewBackgroundColor || '#ffffff';
        ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

        // Apply the hybrid offset.
        const dx = offsetX - h * A4_WIDTH;
        const dy = offsetY - v * A4_HEIGHT;

        ctx.drawImage(pageImageBitmap, dx, dy);

        // Skip uploading if this slice is visually empty (only background)
        if (isSliceVisuallyBlank(ctx, bgColor)) {
          console.warn(
            `Skipping slice ${sliceCount} for page ${pageNumber} as it is visually blank.`,
          );
          continue;
        }

        const blob = await sliceCanvas.convertToBlob({ type: 'image/png' });

        // Upload the slice to the server directly from the worker
        await uploadSlice(
          blob,
          sliceCount,
          pageNumber,
          fileId,
          fileName,
          exportId,
          authToken,
          uploadUrl,
        );
      }
    }

    self.postMessage({
      type: 'complete',
      payload: { pageNumber: pageNumber },
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
    } as WorkerMessage);
  } catch (error) {
    self.postMessage({
      type: 'error',
      payload: error instanceof Error ? error.message : String(error),
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
    } as WorkerMessage);
  } finally {
    self.close();
  }
};
