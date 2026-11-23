import React, { ReactNode, useCallback, useState } from 'react';
import { Transition } from '@headlessui/react';
import {
  SIDE_PANEL_MAX_WIDTH,
  SIDE_PANEL_MIN_WIDTH,
  type ISidePanelDragHandleProps,
} from './hooks/useSidePanelResize';
import { APP_LAYOUT_CLASSES } from '../../helpers/dimensions';

interface SidePanelProps {
  isActive: boolean;
  anyPanelActive: boolean;
  panelClass: string;
  children: ReactNode;
  onToggle: (isOpen: boolean) => void;
  ariaLabel: string;
  dragHandleProps?: ISidePanelDragHandleProps | null;
  panelWidthForA11y?: number | null;
  onNudgeWidth?: (delta: number) => void;
  onResetWidth?: () => void;
  unmount?: boolean;
  isFloating?: boolean;
}

let rememberedIsExpanded = false;

const SidePanel = ({
  isActive,
  anyPanelActive,
  panelClass,
  children,
  onToggle,
  ariaLabel,
  dragHandleProps = null,
  panelWidthForA11y = null,
  onNudgeWidth,
  onResetWidth,
  unmount = true,
  isFloating = false,
}: SidePanelProps) => {
  const [isExpanded, setIsExpanded] = useState(rememberedIsExpanded);
  const [prevIsActive, setPrevIsActive] = useState(isActive);

  if (prevIsActive !== isActive) {
    setPrevIsActive(isActive);
    if (isActive && isExpanded !== rememberedIsExpanded) {
      setIsExpanded(rememberedIsExpanded);
    }
  }

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => {
      rememberedIsExpanded = !prev;
      return rememberedIsExpanded;
    });
  }, []);

  // On panel switch the old panel closes instantly; a real close keeps the slide-out.
  const instantLeave = !isActive && anyPanelActive;
  const slide = isFloating || instantLeave ? '' : 'transform transition ease-in-out duration-300';
  return (
    <Transition
      show={isActive}
      unmount={unmount}
      enter={isFloating ? '' : 'transform transition ease-in-out duration-300'}
      enterFrom={
        isFloating
          ? ''
          : 'translate-y-full md:translate-y-0 md:ltr:translate-x-full md:rtl:-translate-x-full'
      }
      enterTo={isFloating ? '' : 'translate-y-0 md:translate-x-0'}
      leave={slide}
      leaveFrom={slide ? 'translate-y-0 md:translate-x-0' : ''}
      leaveTo={
        slide
          ? 'translate-y-full md:translate-y-0 md:ltr:translate-x-full md:rtl:-translate-x-full'
          : ''
      }
      afterEnter={() => onToggle(true)}
      afterLeave={() => onToggle(false)}
    >
      <div
        className={
          isFloating
            ? `${panelClass} w-full absolute h-full z-10 top-0 left-0 pointer-events-none`
            : `${panelClass} group/sidepanel bottom-0 absolute w-full ${APP_LAYOUT_CLASSES.sidePanel.width} end-0 ${
                isExpanded ? 'h-full z-40' : APP_LAYOUT_CLASSES.sidePanel.mobileHeight
              } md:h-full transition-[height] duration-200 ease-in-out`
        }
        role="complementary"
        aria-label={ariaLabel}
      >
        {/* PC-only drag handle on the inner (start) edge. Hidden on
            mobile/tablet where the panel is a bottom sheet. */}
        {!isFloating && dragHandleProps ? (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize side panel"
            aria-valuemin={SIDE_PANEL_MIN_WIDTH}
            aria-valuemax={SIDE_PANEL_MAX_WIDTH}
            aria-valuenow={panelWidthForA11y ?? undefined}
            tabIndex={0}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 20 : 10;
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                // Panel is docked to `end`: in LTR ArrowLeft widens.
                const isRTL = document.documentElement.dir === 'rtl';
                onNudgeWidth?.(isRTL ? -step : step);
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const isRTL = document.documentElement.dir === 'rtl';
                onNudgeWidth?.(isRTL ? step : -step);
              } else if (e.key === 'Home') {
                e.preventDefault();
                onNudgeWidth?.(SIDE_PANEL_MIN_WIDTH - (panelWidthForA11y ?? 0));
              } else if (e.key === 'End') {
                e.preventDefault();
                onNudgeWidth?.(SIDE_PANEL_MAX_WIDTH - (panelWidthForA11y ?? 0));
              }
            }}
            onDoubleClick={() => onResetWidth?.()}
            title="Drag to resize (double-click to reset)"
            className="hidden md:block absolute top-0 bottom-0 start-0 w-[12px] -ms-[6px] cursor-col-resize z-30 touch-none select-none outline-none"
            {...dragHandleProps}
          >
            <span
              aria-hidden="true"
              className="absolute top-0 bottom-0 start-1/2 w-[3px] -translate-x-1/2 rtl:translate-x-1/2 rounded bg-transparent transition-colors group-hover/sidepanel:bg-Gray-300 dark:group-hover/sidepanel:bg-Gray-700 focus-visible:bg-Blue2-500"
            />
          </div>
        ) : null}
        {!isFloating ? (
          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
            className="md:hidden absolute top-1.5 start-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 z-50 flex items-center justify-center w-8 h-6 rounded-full bg-Gray-100/90 dark:bg-Gray-800/90 border border-Gray-300 dark:border-Gray-700 text-Gray-700 dark:text-Gray-200 shadow-xs cursor-pointer focus-ring"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            >
              <path d="M4 10l4-4 4 4" />
            </svg>
          </button>
        ) : null}
        {children}
      </div>
    </Transition>
  );
};

export default SidePanel;
