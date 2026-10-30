import { ReactElement } from 'react';
import { Track, VideoTrack } from 'livekit-client';
import { VideoParticipantProps } from '../media-elements/videos/videoParticipant';
import i18n from '../../helpers/i18n';

export const MAX_NUM_WEBCAMS_PIP = 5;
export const PIP_WINDOW_HEIGHT = 600;
export const PIP_WINDOW_WIDTH = 280;

export type DocumentPictureInPictureWindow = Window & {
  documentPictureInPicture?: {
    requestWindow: (options: {
      width: number;
      height: number;
      preferInitialWindowPlacement?: boolean;
    }) => Promise<Window>;
  };
};

export interface IPipItem {
  key: string;
  name: string;
  videoTrack?: VideoTrack;
  isCameraMuted: boolean;
}

export const getPipItems = (allParticipants: ReactElement<VideoParticipantProps>[]): IPipItem[] => {
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
  win.document.documentElement.dir = i18n.dir();
  win.document.documentElement.lang = i18n.language;
  win.document.documentElement.style.height = '100%';
  win.document.body.style.height = '100%';
  win.document.body.style.margin = '0';
  win.document.body.style.background = '#000';

  const style = win.document.createElement('style');

  style.textContent = `
    /* The mode switcher floats over the top-left corner and the status badges
       over the top-right one, so both views always reserve a band at the top:
       content then starts below the controls instead of underneath them. The
       extra top padding only shrinks the content box, so the --pip-count based
       max-height calculation stays correct. */
    .pip-flex-container {
      position: relative;
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      gap: 6px;
      box-sizing: border-box;
      padding: 38px 6px 6px;
      overflow: hidden;
      background-color: #000000;
    }

    /* Chat / webcam switch, always visible over the top-left corner. */
    .pip-mode-switcher {
      position: absolute;
      top: 8px;
      inset-inline-start: 8px;
      z-index: 2;
      display: flex;
      gap: 4px;
    }

    .pip-mode-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 6px;
      background-color: rgba(0, 0, 0, 0.65);
      color: #f5f5f5;
      cursor: pointer;
    }

    .pip-mode-button:hover {
      background-color: rgba(0, 0, 0, 0.85);
    }

    .pip-mode-button[aria-pressed='true'] {
      border-color: #00a1f2;
      background-color: #00a1f2;
      color: #ffffff;
    }

    .pip-mode-button:focus-visible {
      outline: 2px solid #ffffff;
      outline-offset: 1px;
    }

    .pip-mode-button svg {
      display: block;
      width: 15px;
      height: 15px;
    }

    /* Informational only: never intercepts pointer events. */
    .pip-status {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 6px;
      border-radius: 999px;
      background-color: rgba(0, 0, 0, 0.65);
      color: #f5f5f5;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
      font-size: 11px;
      line-height: 1;
      font-variant-numeric: tabular-nums;
      pointer-events: none;
      user-select: none;
    }

    /* Floats over the top-right corner of the positioned PiP container. */
    .pip-status-overlay {
      position: absolute;
      top: 10px;
      inset-inline-end: 10px;
      z-index: 1;
      max-width: calc(100% - 20px);
    }

    .pip-status-item {
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .pip-status-item svg {
      display: block;
      width: 12px;
      height: 13px;
      flex: 0 0 auto;
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
      background-color: #262626;
      text-align: center;
      padding: 4px;
      box-sizing: border-box;
    }

    .pip-video-fallback span {
      font-size: 3rem;
      font-weight: 700;
      color: #ffffff;
      user-select: none;
    }

    .pip-chat-container {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
      box-sizing: border-box;
      padding-top: 38px;
      background-color: #0b0b0b;
      color: #f5f5f5;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
      overflow: hidden;
    }

    .pip-chat-list {
      flex: 1 1 auto;
      min-height: 0;
      margin: 0;
      padding: 6px;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
      overflow-wrap: anywhere;
    }

    .pip-chat-item {
      border-radius: 6px;
      padding: 4px 6px;
      background-color: #1a1a1a;
    }

    .pip-chat-name {
      margin: 0 0 2px;
      font-size: 11px;
      font-weight: 600;
      color: #00a1f2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pip-chat-body {
      font-size: 12px;
      line-height: 1.4;
      word-break: break-word;
    }

    .pip-chat-body p {
      margin: 0 0 4px;
    }

    .pip-chat-body p:last-child {
      margin-bottom: 0;
    }

    .pip-chat-body a {
      color: #00a1f2;
    }

    .pip-chat-body code {
      background-color: #262626;
      border-radius: 3px;
      padding: 0 2px;
      font-size: 11px;
    }

    .pip-chat-body pre {
      margin: 0 0 4px;
      overflow-x: auto;
    }

    /* Long code blocks and tables must not widen the whole window. */
    .pip-chat-body table {
      display: block;
      overflow-x: auto;
    }

    .pip-chat-empty {
      color: #9ca3af;
      font-size: 12px;
      text-align: center;
      padding: 8px;
    }

    .pip-chat-form {
      display: flex;
      flex: 0 0 auto;
      gap: 6px;
      padding: 6px;
      border-top: 1px solid #262626;
      background-color: #0b0b0b;
    }

    .pip-chat-input {
      flex: 1 1 auto;
      min-width: 0;
      padding: 6px 8px;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      background-color: #1a1a1a;
      color: #f5f5f5;
      font-family: inherit;
      font-size: 12px;
    }

    .pip-chat-input::placeholder {
      color: #9ca3af;
    }

    .pip-chat-input:focus {
      outline: none;
      border-color: #00a1f2;
    }

    .pip-chat-send {
      flex: 0 0 auto;
      padding: 6px 10px;
      border: none;
      border-radius: 6px;
      background-color: #00a1f2;
      color: #ffffff;
      font-family: inherit;
      font-size: 12px;
      cursor: pointer;
    }

    .pip-chat-send:disabled {
      cursor: default;
      opacity: 0.5;
    }
  `;

  win.document.head.appendChild(style);
};
