import React, { ReactElement, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { VideoParticipantProps } from '../media-elements/videos/videoParticipant';
import { getPipItems, IPipItem } from './pipUtils';
import PipVideoTrack from './pipVideoTrack';
import { usePip } from './pipProvider';
import { useAppSelector } from '../../store';
import { selectRaisedHandsQueue } from '../../store/slices/participantSlice';
import { getPipStatusItems } from './pipStatus';
import PipStatusIndicators from './pipStatusIndicators';

interface IWebcamPipProps {
  pipParticipants: ReactElement<VideoParticipantProps>[];
}

/**
 * Document PiP view of the webcam strip. Renders the portal content and the
 * strip's PiP button, so it has to be rendered inside the strip wrapper to
 * keep the button's position and hover behaviour.
 */
const WebcamPip = ({ pipParticipants }: IWebcamPipProps) => {
  const { t } = useTranslation();
  const { pipWindow, content, isSupported, openPip, releasePip } = usePip();

  const pipItems = useMemo<IPipItem[]>(() => {
    return getPipItems(pipParticipants);
  }, [pipParticipants]);

  const chatUnread = useAppSelector((state) => state.bottomIconsActivity.totalUnreadChatMsgs);
  const raisedHands = useAppSelector((state) => selectRaisedHandsQueue(state).count);
  const unreadNotifications = useAppSelector(
    (state) => state.roomSettings.unreadNotificationsCount,
  );

  const statusItems = useMemo(
    () =>
      getPipStatusItems({
        chatUnread,
        raisedHands,
        notifications: unreadNotifications,
      }),
    [chatUnread, raisedHands, unreadNotifications],
  );

  const hasStatus = statusItems.length > 0;

  // The strip no longer owns the window: close it on unmount only while it is
  // still showing the webcam view, so a chat PiP survives.
  useEffect(() => {
    return () => releasePip('webcam');
  }, [releasePip]);

  return (
    <>
      {pipWindow &&
        content === 'webcam' &&
        createPortal(
          <div
            className={clsx('pip-flex-container', hasStatus && 'pip-flex-with-status')}
            style={
              {
                '--pip-count': Math.max(pipItems.length, 1),
              } as React.CSSProperties & Record<'--pip-count', number>
            }
          >
            <PipStatusIndicators items={statusItems} />
            {pipItems.map((item) => (
              <PipVideoTrack key={item.key} videoTrack={item.videoTrack} name={item.name} />
            ))}
          </div>,
          pipWindow.document.body,
        )}

      {isSupported && (
        <button
          type="button"
          className="cam-pip cursor-pointer w-7 h-7 rounded-full bg-Gray-950/50 dark:bg-Gray-50 shadow-shadowXS flex items-center justify-center absolute top-2 end-2 z-50 opacity-0 group-hover:opacity-100 transition-all duration-300"
          aria-label={t('pip')}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openPip('webcam');
          }}
          title={t('pip')}
        >
          <i className="icon pnm-pip text-[14px] text-white dark:text-Gray-900" />
        </button>
      )}
    </>
  );
};

export default WebcamPip;
