import { A4_WIDTH, A4_HEIGHT, WorkerInput, WorkerMessage } from './types';

/**
 * Resolves any valid CSS color string into RGB components using browser parsing.
 */
function parseCssColorToRgb(color: string): [number, number, number] {
  const scratch = new OffscreenCanvas(1, 1);
  const ctx = scratch.getContext('2d');

  if (!ctx) {
    return [255, 255, 255];
  }

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);

  const data = ctx.getImageData(0, 0, 1, 1).data;

  return [data[0], data[1], data[2]];
}

/**
 * Checks whether a rendered slice contains only background-colored pixels.
 */
function isSliceVisuallyBlank(
  ctx: OffscreenCanvasRenderingContext2D,
  targetR: number,
  targetG: number,
  targetB: number,
  tolerance = 3,
): boolean {
  const imgData = ctx.getImageData(0, 0, A4_WIDTH, A4_HEIGHT);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r === targetR && g === targetG && b === targetB) {
      continue;
    }

    if (
      Math.abs(r - targetR) > tolerance ||
      Math.abs(g - targetG) > tolerance ||
      Math.abs(b - targetB) > tolerance
    ) {
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
  let uploadedSlicesCount = 0;

  const sliceCanvas = new OffscreenCanvas(A4_WIDTH, A4_HEIGHT);
  const ctx = sliceCanvas.getContext('2d', {
    alpha: false,
  });

  if (!ctx) {
    self.postMessage({
      type: 'error',
      payload: 'Failed to create OffscreenCanvas 2D context',
      // oxlint-disable-next-line
    } as WorkerMessage);

    self.close();
    return;
  }

  const bgColorStr = appState.viewBackgroundColor || '#ffffff';
  const [bgR, bgG, bgB] = parseCssColorToRgb(bgColorStr);

  try {
    for (let v = 0; v < verticalSlices; v++) {
      for (let h = 0; h < horizontalSlices; h++) {
        sliceCount++;

        self.postMessage({
          type: 'progress',
          payload: {
            currentPage: sliceCount,
            totalPages: totalSlices,
            pageNumber,
          },
          // oxlint-disable-next-line unicorn/require-post-message-target-origin
        } as WorkerMessage);

        ctx.fillStyle = bgColorStr;
        ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

        const dx = offsetX - h * A4_WIDTH;
        const dy = offsetY - v * A4_HEIGHT;

        ctx.drawImage(pageImageBitmap, dx, dy);

        const isBlank = isSliceVisuallyBlank(ctx, bgR, bgG, bgB, 3);

        // we'll skip to upload any blank page slices
        if (isBlank) {
          console.warn(
            `Skipping slice ${sliceCount} for page ${pageNumber} as it is visually blank.`,
          );
          continue;
        }

        const blob = await sliceCanvas.convertToBlob({
          type: 'image/png',
        });

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

        uploadedSlicesCount++;
      }
    }

    self.postMessage({
      type: 'complete',
      payload: {
        pageNumber,
      },
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
    } as WorkerMessage);
  } catch (error) {
    self.postMessage({
      type: 'error',
      payload: error instanceof Error ? error.message : String(error),
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
    } as WorkerMessage);
  } finally {
    pageImageBitmap.close();
    self.close();
  }
};
