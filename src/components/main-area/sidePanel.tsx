import React, { ReactNode } from 'react';
import { Transition } from '@headlessui/react';
import {
  SIDE_PANEL_MAX_WIDTH,
  SIDE_PANEL_MIN_WIDTH,
  type ISidePanelDragHandleProps,
} from './hooks/useSidePanelResize';

interface SidePanelProps {
  isActive: boolean;
  panelClass: string;
  children: ReactNode;
  onToggle: (isOpen: boolean) => void;
  ariaLabel: string;
  dragHandleProps?: ISidePanelDragHandleProps | null;
  panelWidthForA11y?: number | null;
  onNudgeWidth?: (delta: number) => void;
  onResetWidth?: () => void;
}

const SidePanel = ({
  isActive,
  panelClass,
  children,
  onToggle,
  ariaLabel,
  dragHandleProps = null,
  panelWidthForA11y = null,
  onNudgeWidth,
  onResetWidth,
}: SidePanelProps) => {
  return (
    <Transition
      show={isActive}
      enter="transform transition ease-in-out duration-300"
      enterFrom="translate-y-full md:translate-y-0 md:ltr:translate-x-full md:rtl:-translate-x-full"
      enterTo="translate-y-0 md:translate-x-0"
      leave="transform transition ease-in-out duration-300"
      leaveFrom="translate-y-0 md:translate-x-0"
      leaveTo="translate-y-full md:translate-y-0 md:ltr:translate-x-full md:rtl:-translate-x-full"
      afterEnter={() => onToggle(true)}
      afterLeave={() => onToggle(false)}
    >
      <div
        className={`${panelClass} group/sidepanel bottom-0 absolute w-full md:w-[var(--side-panel-width,300px)] 3xl:w-[var(--side-panel-width,340px)] end-0 h-[300px] md:h-full`}
        role="complementary"
        aria-label={ariaLabel}
      >
        {/* PC-only drag handle on the inner (start) edge. Hidden on
            mobile/tablet where the panel is a bottom sheet. */}
        {dragHandleProps ? (
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
        {children}
      </div>
    </Transition>
  );
};

export default SidePanel;
