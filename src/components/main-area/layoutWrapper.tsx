import React, { ReactNode, useMemo } from 'react';

import { useAppSelector } from '../../store';

interface ILayoutWrapperProps {
  isActiveScreenShare: boolean;
  showVideoElms: boolean;
  showVerticalVideoView: boolean;
  children: ReactNode;
}

const LayoutWrapper = ({
  isActiveScreenShare,
  showVideoElms,
  showVerticalVideoView,
  children,
}: ILayoutWrapperProps) => {
  const isEnabledExtendedVerticalCamView = useAppSelector(
    (state) => state.bottomIconsActivity.isEnabledExtendedVerticalCamView,
  );
  const pinCamUserId = useAppSelector(
    (state) => state.roomSettings.pinCamUserId,
  );

  const cssClasses = useMemo(() => {
    const classes = new Set<string>(['relative']);

    if (isActiveScreenShare) {
      classes
        .add('middle-fullscreen-wrapper')
        .add('share-screen-wrapper')
        .add('is-share-screen-running');

      if (showVideoElms) {
        if (showVerticalVideoView) {
          classes.add('verticalsWebcamsActivated');
        }
        if (isEnabledExtendedVerticalCamView) {
          classes.add('extendedVerticalCamView');
        }
        if (pinCamUserId) {
          classes.add('pinWebcamActivated');
        }
      }
    } else {
      if (showVideoElms && !showVerticalVideoView && !pinCamUserId) {
        classes.add('h-full');
      } else if (showVideoElms) {
        classes.add('middle-fullscreen-wrapper').add('h-full').add('flex');

        if (showVerticalVideoView) {
          classes.add('verticalsWebcamsActivated');
        }
        if (isEnabledExtendedVerticalCamView) {
          classes.add('extendedVerticalCamView');
        }
        if (pinCamUserId) {
          // when we've pin cam then need to manually activate verticalsWebcams layout
          // showVerticalVideoView will be false as no whiteboard or screen sharing or similar is active
          classes.add('pinWebcamActivated').add('verticalsWebcamsActivated');
        }
      } else {
        classes
          .add('middle-fullscreen-wrapper')
          .add('h-full')
          .add('flex')
          .add('w-full');
      }
    }
    return Array.from(classes).join(' ').trim();
  }, [
    isActiveScreenShare,
    showVideoElms,
    showVerticalVideoView,
    isEnabledExtendedVerticalCamView,
    pinCamUserId,
  ]);

  return <div className={cssClasses}>{children}</div>;
};

export default LayoutWrapper;
