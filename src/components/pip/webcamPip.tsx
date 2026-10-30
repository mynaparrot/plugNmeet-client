import React, { ReactElement, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { VideoParticipantProps } from '../media-elements/videos/videoParticipant';
import { getPipItems, IPipItem } from './pipUtils';
import PipVideoTrack from './pipVideoTrack';
import { usePip } from './pipProvider';

interface IWebcamPipProps {
  pipParticipants: ReactElement<VideoParticipantProps>[];
}

/**
 * Document PiP view of the webcam strip: webcam tiles plus the strip's PiP
 * button. The button has to live inside the strip wrapper to keep its position
 * and hover behaviour, and the shared header is mounted by PublicChatPip.
 */
const WebcamPip = ({ pipParticipants }: IWebcamPipProps) => {
  const { t } = useTranslation();
  const { pipWindow, content, isSupported, openPip } = usePip();

  const pipItems = useMemo<IPipItem[]>(() => {
    return getPipItems(pipParticipants);
  }, [pipParticipants]);

  return (
    <>
      {pipWindow &&
        content === 'webcam' &&
        createPortal(
          <div
            className="pip-flex-container"
            style={
              {
                '--pip-count': Math.max(pipItems.length, 1),
              } as React.CSSProperties & Record<'--pip-count', number>
            }
          >
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
          aria-label={t('pip.label')}
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
          title={t('pip.label')}
        >
          <i className="icon pnm-pip text-[14px] text-white dark:text-Gray-900" />
        </button>
      )}
    </>
  );
};

export default WebcamPip;
