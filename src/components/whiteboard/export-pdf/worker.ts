import { WorkerInput, WorkerMessage } from './types';

const SCALE = 2;
const A4_WIDTH = 1240 * SCALE;
const A4_HEIGHT = 1754 * SCALE;

self.onmessage = async (event: MessageEvent<WorkerInput>) => {
  const { pageImageBitmap, appState } = event.data;

  const horizontalSlices = Math.ceil(pageImageBitmap.width / A4_WIDTH);
  const verticalSlices = Math.ceil(pageImageBitmap.height / A4_HEIGHT);
  const totalSlices = horizontalSlices * verticalSlices;
  const dataUrls: string[] = [];
  let sliceCount = 0;

  try {
    for (let v = 0; v < verticalSlices; v++) {
      for (let h = 0; h < horizontalSlices; h++) {
        sliceCount++;
        self.postMessage({
          type: 'progress',
          payload: { currentPage: sliceCount, totalPages: totalSlices },
          //oxlint-disable-next-line
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

        // TODO: Upload the slice to the server

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

    //TODO: send merge PDF request when everything is uploaded

    self.postMessage({
      type: 'complete',
      payload: { dataUrls },
      //oxlint-disable-next-line
    } as WorkerMessage);
  } catch (error) {
    self.postMessage({
      type: 'error',
      payload: error instanceof Error ? error.message : String(error),
      //oxlint-disable-next-line
    } as WorkerMessage);
  } finally {
    self.close();
  }
};
