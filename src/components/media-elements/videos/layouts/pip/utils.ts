import { ReactElement } from 'react';
import { Track, VideoTrack } from 'livekit-client';
import { VideoParticipantProps } from '../../videoParticipant';

export const MAX_NUM_WEBCAMS_PIP = 5;
export const PIP_WINDOW_HEIGHT = 600;
export const PIP_WINDOW_WIDTH = 280;

export type DocumentPictureInPictureWindow = Window & {
  documentPictureInPicture?: {
    requestWindow: (options: {
      width: number;
      height: number;
    }) => Promise<Window>;
  };
};

export interface IPipItem {
  key: string;
  name: string;
  videoTrack?: VideoTrack;
  isCameraMuted: boolean;
}

export const getPipItems = (
  allParticipants: ReactElement<VideoParticipantProps>[],
): IPipItem[] => {
  const items: IPipItem[] = [];

  for (const participantElement of allParticipants) {
    const participant = participantElement.props.participant;
    const trackPub = participant.getTrackPublication(Track.Source.Camera);

    if (!trackPub) continue;

    const videoTrack = trackPub.videoTrack as VideoTrack | undefined;
    const isSubscribed = trackPub.isSubscribed;
    const isCameraMuted = trackPub.isMuted || !isSubscribed;

    items.push({
      key: `${participant.sid}-${trackPub.trackSid || 'no-track'}`,
      name: participant.name ?? '',
      videoTrack: isSubscribed ? videoTrack : undefined,
      isCameraMuted,
    });

    if (items.length >= MAX_NUM_WEBCAMS_PIP) break;
  }

  return items;
};

export const injectPipStyles = (win: Window) => {
  win.document.documentElement.style.height = '100%';
  win.document.body.style.height = '100%';
  win.document.body.style.margin = '0';
  win.document.body.style.background = '#000';

  const style = win.document.createElement('style');

  style.textContent = `
    .pip-flex-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      gap: 6px;
      box-sizing: border-box;
      padding: 6px;
      overflow: hidden;
      background-color: #000000;
    }

    .pip-video-item,
    .pip-video-fallback {
      width: 100%;
      border-radius: 6px;
      background-color: #1a1a1a;
      max-height: calc((100% - ((var(--pip-count, 1) - 1) * 6px)) / var(--pip-count, 1));
      object-fit: contain;
      flex: 1 1 0;
      min-height: 0;
    }

    .pip-video-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-family: sans-serif;
      font-size: 13px;
      background-color: #262626;
      text-align: center;
      padding: 4px;
      box-sizing: border-box;
    }
  `;

  win.document.head.appendChild(style);
};
