import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  SOURCE_CANVAS_SELECTOR,
  STAGE_SELECTOR,
  captureStageSnapshot,
} from '../helpers/hooks/useWhiteboardPageTransition';

/*
 * The page transition copies Excalidraw's painted canvas through internal class
 * names that are not part of its public API. An upgrade that renames them must
 * fail here (instead of silently losing the transition), and the copied frame
 * must degrade to "no overlay" rather than hiding a live canvas.
 */

const readInstalled = (request: string): string => {
  const require = createRequire(import.meta.url);
  const resolved = require.resolve(request);
  const candidates = [
    resolved,
    resolved.includes('prod') ? resolved.replace('prod', 'dev') : resolved.replace('dev', 'prod'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, 'utf8');
    }
  }
  throw new Error(`Cannot read the installed file: ${resolved}`);
};

/** `dist` is not part of the package `exports`, so the css is resolved by path. */
const readInstalledCss = (): string => {
  const require = createRequire(import.meta.url);
  let dir = dirname(require.resolve('@excalidraw/excalidraw'));
  while (!existsSync(resolve(dir, 'package.json'))) {
    dir = dirname(dir);
  }
  return readFileSync(resolve(dir, 'dist/prod/index.css'), 'utf8');
};

interface FakeCanvas {
  width: number;
  height: number;
  getContext: (id: string) => unknown;
}

const fakeSnapshot = () => {
  const context = {
    fillStyle: '',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  };
  const canvas: FakeCanvas = {
    width: 0,
    height: 0,
    getContext: () => context,
  };
  return { canvas, context };
};

const fakeStage = (options: { source?: Partial<FakeCanvas> | null; background?: string }) => {
  const elements: Record<string, unknown> = {};
  if (options.source !== null) {
    elements[SOURCE_CANVAS_SELECTOR] = { width: 800, height: 600, ...options.source };
  }
  if (options.background !== undefined) {
    elements['.excalidraw'] = {};
    vi.stubGlobal('getComputedStyle', () => ({ backgroundColor: options.background }));
  }
  return {
    querySelector: (selector: string) => elements[selector] ?? null,
  } as unknown as HTMLElement;
};

describe('captureStageSnapshot', () => {
  it('copies the painted canvas at its device pixel size', () => {
    const { canvas, context } = fakeSnapshot();
    const stage = fakeStage({ source: { width: 1024, height: 768 } });

    expect(captureStageSnapshot(stage, canvas as unknown as HTMLCanvasElement)).toBe(true);
    expect(canvas.width).toBe(1024);
    expect(canvas.height).toBe(768);
    expect(context.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0);
  });

  it('paints the whiteboard background under the copy so gaps never flash white', () => {
    const { canvas, context } = fakeSnapshot();
    const stage = fakeStage({ source: {}, background: 'rgb(18, 18, 18)' });

    expect(captureStageSnapshot(stage, canvas as unknown as HTMLCanvasElement)).toBe(true);
    expect(context.fillStyle).toBe('rgb(18, 18, 18)');
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it.each(['transparent', 'rgba(0, 0, 0, 0)', ''])(
    'skips the background fill for the non-painting colour %s',
    (background) => {
      const { canvas, context } = fakeSnapshot();
      const stage = fakeStage({ source: {}, background: background || undefined });

      expect(captureStageSnapshot(stage, canvas as unknown as HTMLCanvasElement)).toBe(true);
      expect(context.fillRect).not.toHaveBeenCalled();
    },
  );

  it('refuses to hold when Excalidraw no longer exposes the static canvas', () => {
    const { canvas } = fakeSnapshot();
    const stage = fakeStage({ source: null });

    expect(captureStageSnapshot(stage, canvas as unknown as HTMLCanvasElement)).toBe(false);
    // nothing was written: the stage must not be hidden behind an empty overlay
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it.each([0, 1])('refuses to hold a canvas that renders %i pixels wide', (width) => {
    const { canvas } = fakeSnapshot();
    const stage = fakeStage({ source: { width, height: 600 } });

    expect(captureStageSnapshot(stage, canvas as unknown as HTMLCanvasElement)).toBe(width > 0);
  });

  it('refuses to hold when a 2d context is unavailable', () => {
    const canvas: FakeCanvas = { width: 0, height: 0, getContext: () => null };
    const stage = fakeStage({ source: {} });

    expect(captureStageSnapshot(stage, canvas as unknown as HTMLCanvasElement)).toBe(false);
  });
});

describe('@excalidraw/excalidraw DOM contract', () => {
  const bundle = readInstalled('@excalidraw/excalidraw');
  const css = readInstalledCss();

  it('still marks the static canvas exactly as our selector expects', () => {
    expect(STAGE_SELECTOR).toBe('.wb-canvas-stage');
    expect(SOURCE_CANVAS_SELECTOR).toBe('canvas.excalidraw__canvas.static');

    // The selector only works while Excalidraw tags its canvas with both names.
    expect(bundle).toMatch(
      /classList\.add\(\s*["'`]excalidraw__canvas["'`]\s*,\s*["'`]static["'`]\s*\)/,
    );
    expect(css).toContain('.excalidraw__canvas.static');
  });

  it('still renders the canvas inside the wrapper we keep intact', () => {
    expect(bundle).toContain('excalidraw__canvas-wrapper');
    expect(css).toContain('.excalidraw__canvas-wrapper');
  });

  it('keeps the UI layer above the canvas, so the snapshot never covers toolbars', () => {
    const zIndex = (name: string): number => {
      const match = css.match(new RegExp(`--zIndex-${name}:\\s*(\\d+)`));
      if (!match) {
        throw new Error(`--zIndex-${name} disappeared from the Excalidraw stylesheet`);
      }
      return Number(match[1]);
    };

    expect(zIndex('canvas')).toBeLessThan(zIndex('interactiveCanvas'));
    expect(zIndex('interactiveCanvas')).toBeLessThan(zIndex('layerUI'));
  });

  it('keeps the snapshot z-index between the canvases and the UI layer', () => {
    const stylePath = resolve(dirname(new URL(import.meta.url).pathname), '../style.css');
    const style = readFileSync(stylePath, 'utf8');
    const snapshotBlock = style.match(/\.wb-page-snapshot\s*\{[^}]*\}/);
    expect(snapshotBlock).not.toBeNull();

    const zIndex = Number(snapshotBlock![0].match(/z-index:\s*(\d+)/)?.[1]);
    const uiLayer = Number(css.match(/--zIndex-layerUI:\s*(\d+)/)?.[1]);
    const interactiveCanvas = Number(css.match(/--zIndex-interactiveCanvas:\s*(\d+)/)?.[1]);

    expect(zIndex).toBeGreaterThan(interactiveCanvas);
    expect(zIndex).toBeLessThan(uiLayer);
  });
});
