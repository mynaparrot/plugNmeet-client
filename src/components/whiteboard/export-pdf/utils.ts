import {
  DEFAULT_A4_HEIGHT,
  DEFAULT_A4_WIDTH,
  DEFAULT_PAGE_ORIENTATION,
  PageOrientation,
  PageSize,
  SCALE,
} from './types';

/**
 * Normalize a rendered page (page_N_meta.json pixels) to the standard frame:
 * the long side is always A4's long side (DEFAULT_A4_HEIGHT), the short side
 * follows the page's real aspect ratio.
 *
 * This keeps viewport zoom/scroll stable for ANY source page, while A4 pages
 * map to the exact same frames as the A4 constants:
 * - A4 portrait  2480x3508 -> 1240x1754
 * - A4 landscape 3508x2480 -> 1754x1240
 * - 16:9 slide   8000x4500 -> 1754x986
 * - US Letter    2550x3300 -> 1355x1754
 */
export const pageSizeFromMetaPixels = (
  pixelWidth?: number,
  pixelHeight?: number,
): PageSize | null => {
  if (!pixelWidth || !pixelHeight || pixelWidth <= 0 || pixelHeight <= 0) {
    return null;
  }

  const ratio = pixelWidth / pixelHeight;
  const longSide = DEFAULT_A4_HEIGHT;

  if (ratio >= 1) {
    // Landscape: standard width, aspect-derived height.
    return {
      width: longSide,
      height: Math.max(1, Math.round(longSide / ratio)),
    };
  }
  // Portrait: standard height, aspect-derived width.
  return {
    width: Math.max(1, Math.round(longSide * ratio)),
    height: longSide,
  };
};

/** Logical A4 page size (pre-scale) for the given orientation. */
export const getPageSize = (
  orientation: PageOrientation = DEFAULT_PAGE_ORIENTATION,
): PageSize => {
  if (orientation === 'landscape') {
    // will be flipped
    return {
      width: DEFAULT_A4_HEIGHT,
      height: DEFAULT_A4_WIDTH,
    };
  }
  return {
    width: DEFAULT_A4_WIDTH,
    height: DEFAULT_A4_HEIGHT,
  };
};

/** Export-time pixel size (logical size * SCALE). */
export const getExportPageSize = (
  orientation: PageOrientation = DEFAULT_PAGE_ORIENTATION,
): PageSize => {
  const size = getPageSize(orientation);
  return {
    width: size.width * SCALE,
    height: size.height * SCALE,
  };
};

export const resolvePageOrientation = (
  value?: string | null,
): PageOrientation => {
  return value === 'landscape' ? 'landscape' : 'portrait';
};
