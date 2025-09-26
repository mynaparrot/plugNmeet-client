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
    const classes: Array<string> = [];
    if (isActiveScreenShare) {
      classes.push(
        'middle-fullscreen-wrapper share-screen-wrapper is-share-screen-running relative',
      );
      if (showVideoElms) {
        if (showVerticalVideoView) {
          classes.push('verticalsWebcamsActivated relative');
        }
        if (isEnabledExtendedVerticalCamView) {
          classes.push('extendedVerticalCamView relative');
        }
        if (pinCamUserId) {
          classes.push('pinWebcamActivated verticalsWebcamsActivated relative');
        }
      }
    } else {
      if (showVideoElms && !showVerticalVideoView && !pinCamUserId) {
        classes.push('h-full relative');
      } else if (showVideoElms) {
        classes.push('middle-fullscreen-wrapper h-full flex relative');
        if (showVerticalVideoView) {
          classes.push('verticalsWebcamsActivated relative');
        }
        if (isEnabledExtendedVerticalCamView) {
          classes.push('extendedVerticalCamView relative');
        }
        if (pinCamUserId) {
          classes.push('pinWebcamActivated verticalsWebcamsActivated relative');
        }
      } else {
        classes.push('middle-fullscreen-wrapper h-full flex w-full relative');
      }
    }
    return classes.join(' ');
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
