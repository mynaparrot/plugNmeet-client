import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LocalTrackPublication, RemoteTrackPublication } from 'livekit-client';

import VideoElm from './videoElm';
import PinWebcam from './pinWebcam';
import MicStatus from './micStatus';
import ConnectionStatus from './connectionStatus';
import { sleep, generateAvatarInitial } from '../../../../helpers/utils';
import Participant from './participant';

export interface IVideoComponentProps {
  userId: string;
  name: string;
  isLocal: boolean;
  track: RemoteTrackPublication | LocalTrackPublication;
  displayPinIcon: boolean;
  showVideo: boolean;
  showPausedNotice: boolean;
}

const VideoComponent = ({
  userId,
  name,
  isLocal,
  track,
  displayPinIcon,
  showVideo,
  showPausedNotice,
}: IVideoComponentProps) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  const fullScreen = async () => {
    if (!document.fullscreenElement) {
      videoRef?.current?.requestFullscreen().catch((err) => {
        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      await document.exitFullscreen();
    }
  };

  const pictureInPicture = async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      await sleep(500);
    }
    if (videoRef && videoRef.current) {
      await videoRef.current.requestPictureInPicture();
    }
  };

  return (
    <div className="video-camera-item-inner w-full h-full relative">
      <Participant userId={userId} name={name} isLocal={isLocal} />
      <div className="camera-modules">
        <div className="camera-video-player">
          <MicStatus userId={userId} />
          {showVideo ? (
            <VideoElm track={track} ref={videoRef} mirrored={isLocal} />
          ) : (
            <div className="camera-muted-fallback relative w-full h-full flex items-center justify-center bg-black">
              <span className="avatar-initial font-bold text-white select-none">
                {generateAvatarInitial(name)}
              </span>
              {showPausedNotice && (
                <span className="absolute top-2 inset-x-0 text-center text-[10px] font-medium text-amber-400">
                  {t('notifications.video-paused')}
                </span>
              )}
            </div>
          )}
          <div className="cam-icons w-max h-auto flex items-center gap-2 absolute top-1/2 start-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 z-999 transition-all duration-300 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 has-focus-visible:opacity-100">
            {displayPinIcon ? <PinWebcam userId={userId} /> : null}
            {showVideo && (
              <>
                <button
                  className="cam-fullscreen cursor-pointer w-7 h-7 rounded-full bg-Gray-950/50 shadow-shadowXS flex items-center justify-center"
                  onClick={fullScreen}
                  aria-label="Fullscreen"
                >
                  <i className="icon pnm-fullscreen text-[14px] text-white" />
                </button>
                {document.pictureInPictureEnabled && (
                  <button
                    className="cam-pip cursor-pointer w-7 h-7 rounded-full bg-Gray-950/50 shadow-shadowXS flex items-center justify-center"
                    onClick={pictureInPicture}
                    aria-label="Picture in picture"
                  >
                    <i className="icon pnm-pip text-[14px] text-white" />
                  </button>
                )}
              </>
            )}
            <ConnectionStatus userId={userId} name={name} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoComponent;
