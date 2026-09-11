export const APP_DIMENSIONS = {
  sidePanel: {
    minWidth: 280,
    maxWidth: 480,
  },
  verticalWebcams: {
    extendedRestoreMinWidth: 1400,
  },
  breakpoints: {
    pc: 1024, // PC-only drag handle
    wide: 1760, // 3xl in px
  },
} as const;

/** Alias for main-area imports. */
export const MAIN_AREA_DIMENSIONS = {
  sidePanel: APP_DIMENSIONS.sidePanel,
  verticalWebcams: APP_DIMENSIONS.verticalWebcams,
  breakpoints: APP_DIMENSIONS.breakpoints,
} as const;

/**
 * Static Tailwind slices (single source for class strings).
 * Literals live here so the Tailwind scanner still finds them;
 * components interpolate these instead of hardcoding.
 */
export const APP_LAYOUT_CLASSES = {
  headerHeight: 'min-h-[54px] 3xl:min-h-[68px]',
  footerHeight: 'h-[54px] 3xl:h-[76px]',
  notificationsPanel:
    'w-[300px] 3xl:w-[340px] h-[calc(100%-110px)] 3xl:h-[calc(100%-144px)] top-[54px] 3xl:top-[68px]',
  notificationsScroll: 'h-[calc(100vh-148px)] 3xl:h-[calc(100vh-184px)]',
  sidePanel: {
    width:
      'md:w-[var(--side-panel-width,300px)] 3xl:w-[var(--side-panel-width,340px)]',
    mobileHeight: 'h-[300px]',
    defaultWidth: 300, // fallback inside the var() above
    defaultWidthWide: 340,
  },
  middleAreaOpen:
    'pb-[300px] md:pb-0 md:pe-[var(--side-panel-width,300px)] 3xl:pe-[var(--side-panel-width,340px)]',
  activeSpeakersOpen:
    'md:w-[calc(100%-var(--side-panel-width,300px))] 3xl:w-[calc(100%-var(--side-panel-width,340px))]',
  verticalWebcams: {
    stripWidth: 'md:w-[212px]',
    stripWidthExtended: 'xl:w-[416px]',
    stripWidthCompact: 'w-[140px]',
    bottomBarHeight: 'h-[110px]',
  },
} as const;
