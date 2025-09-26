import React, { useRef } from 'react';
import { LocalTrackPublication, RemoteTrackPublication } from 'livekit-client';

import VideoElm from './videoElm';
import PinWebcam from './pinWebcam';
import MicStatus from './micStatus';
import ConnectionStatus from './connectionStatus';
import { sleep } from '../../../../helpers/utils';
import Participant from './participant';

export interface IVideoComponentProps {
  userId: string;
  name: string;
  isLocal: boolean;
  track: RemoteTrackPublication | LocalTrackPublication;
  displayPinIcon: boolean;
}

const VideoComponent = ({
  userId,
  name,
  isLocal,
  track,
  displayPinIcon,
}: IVideoComponentProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const fullScreen = async () => {
    if (!document.fullscreenElement) {
      videoRef?.current?.requestFullscreen().catch((err) => {
        alert(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`,
        );
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
          <VideoElm track={track} ref={videoRef} />
          <div className="cam-icons w-max h-auto flex items-center gap-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-999 transition-all duration-300 opacity-0 group-hover:opacity-100">
            {displayPinIcon ? <PinWebcam userId={userId} /> : null}
            <button
              className="cam-fullscreen cursor-pointer w-7 h-7 rounded-full bg-Gray-950/50 shadow-shadowXS flex items-center justify-center"
              onClick={fullScreen}
            >
              <i className="icon pnm-fullscreen text[14px] text-white" />
            </button>
            {document.pictureInPictureEnabled ? (
              <button
                className="cam-pip cursor-pointer w-7 h-7 rounded-full bg-Gray-950/50 shadow-shadowXS flex items-center justify-center"
                onClick={pictureInPicture}
              >
                <i className="icon pnm-pip text-[14px] text-white" />
              </button>
            ) : null}
            <ConnectionStatus userId={userId} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoComponent;
