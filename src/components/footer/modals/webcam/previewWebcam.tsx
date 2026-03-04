import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isSupported } from '@twilio/video-processors';
import {
  createLocalVideoTrack,
  LocalVideoTrack,
  VideoPresets,
} from 'livekit-client';

import { useAppDispatch, useAppSelector } from '../../../../store';
import BackgroundItems from './backgroundItems';
import { updateVirtualBackground } from '../../../../store/slices/bottomIconsActivitySlice';
import {
  BackgroundConfig,
  createVirtualBackgroundProcessor,
  TwilioBackgroundProcessor,
} from '../../../../helpers/libs/TrackProcessor';

interface IPreviewWebcamProps {
  deviceId: string;
}

const PreviewWebcam = ({ deviceId }: IPreviewWebcamProps) => {
  const { t } = useTranslation();
  const virtualBackground = useAppSelector(
    (state) => state.bottomIconsActivity.virtualBackground,
  );
  const [videoTrack, setVideoTrack] = useState<LocalVideoTrack>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (deviceId && videoRef.current) {
      // stop previous track before creating a new one
      if (videoTrack) {
        videoTrack.detach();
        videoTrack.stop();
      }

      let processor: TwilioBackgroundProcessor | undefined;
      if (virtualBackground.type !== 'none') {
        processor = createVirtualBackgroundProcessor(virtualBackground);
      }

      createLocalVideoTrack({
        deviceId,
        resolution: VideoPresets.h720.resolution,
        processor,
      }).then((track) => {
        setVideoTrack(track);
        if (videoRef.current) {
          track.attach(videoRef.current);
        }
      });
    }

    return () => {
      // stop track on component unmount
      if (videoTrack) {
        videoTrack.detach();
        videoTrack.stop();
      }
    };
    //oxlint-disable-next-line
  }, [deviceId, virtualBackground]);

  const onSelectBg = (bg: BackgroundConfig) => {
    dispatch(updateVirtualBackground(bg));
  };

  return (
    <div className="">
      <div className="w-full overflow-hidden rounded-lg relative bg-black min-h-64 3xl:min-h-80">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
        />
      </div>
      {isSupported && (
        <>
          <div className="title text-xs md:text-sm leading-none text-Gray-700 dark:text-dark-text px-1 md:px-3 uppercase pt-5 3x:pt-8 pb-5">
            {t('footer.modal.chose-virtual-bg')}
          </div>
          <BackgroundItems onSelect={onSelectBg} />
        </>
      )}
    </div>
  );
};

export default PreviewWebcam;
