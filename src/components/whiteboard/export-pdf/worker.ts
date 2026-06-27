import { WorkerInput, WorkerMessage } from './types';

const SCALE = 2;
const A4_WIDTH = 1240 * SCALE;
const A4_HEIGHT = 1754 * SCALE;

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

  // Ensure we have at least 1 slice in each direction
  const horizontalSlices = Math.max(
    1,
    Math.ceil(pageImageBitmap.width / A4_WIDTH),
  );
  const verticalSlices = Math.max(
    1,
    Math.ceil(pageImageBitmap.height / A4_HEIGHT),
  );
  const totalSlices = horizontalSlices * verticalSlices;

  // Calculate the total width of our virtual A4 paper grid
  const totalGridWidth = horizontalSlices * A4_WIDTH;

  // --- THE HYBRID OFFSET ---
  // 1. HORIZONTAL: Calculate leftover horizontal space and divide by 2 to center it.
  const offsetX = (totalGridWidth - pageImageBitmap.width) / 2;

  // 2. VERTICAL: Lock to 0. Excalidraw's native padding handles the top margin.
  const offsetY = 0;

  let sliceCount = 0;

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

        const sliceCanvas = new OffscreenCanvas(A4_WIDTH, A4_HEIGHT);
        const ctx = sliceCanvas.getContext('2d');
        if (!ctx) continue;

        ctx.fillStyle = appState.viewBackgroundColor || '#ffffff';
        ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

        // Apply the hybrid offset.
        const dx = offsetX - h * A4_WIDTH;
        const dy = offsetY - v * A4_HEIGHT;

        ctx.drawImage(pageImageBitmap, dx, dy);

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
