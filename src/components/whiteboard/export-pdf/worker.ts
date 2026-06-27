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

  formData.append('file_id', fileId);
  formData.append('file_name', fileName);
  formData.append('page_number', String(pageNumber));
  formData.append('slice_number', String(sliceNumber));
  formData.append('export_id', exportId);
  formData.append('file', blob, `${sliceNumber}.png`);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: authToken,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to upload slice ${sliceNumber} for page ${pageNumber}. Server: ${errorText}`,
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

  const horizontalSlices = Math.ceil(pageImageBitmap.width / A4_WIDTH);
  const verticalSlices = Math.ceil(pageImageBitmap.height / A4_HEIGHT);
  const totalSlices = horizontalSlices * verticalSlices;
  const dataUrls: string[] = []; // Keep for testing
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

        ctx.drawImage(
          pageImageBitmap,
          h * A4_WIDTH,
          v * A4_HEIGHT,
          A4_WIDTH,
          A4_HEIGHT,
          0,
          0,
          A4_WIDTH,
          A4_HEIGHT,
        );

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

        // For testing: generate a data URL to send back to the main thread
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        dataUrls.push(dataUrl);
      }
    }

    self.postMessage({
      type: 'complete',
      payload: { pageNumber: pageNumber, dataUrls: dataUrls }, // Keep dataUrls for testing
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
