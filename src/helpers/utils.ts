import { AudioPresets, ScreenSharePresets, VideoPresets } from 'livekit-client';
import { errors } from '@nats-io/nats-core';

import i18n from './i18n';
import { store } from '../store';
import { participantsSelector } from '../store/slices/participantSlice';
import { IParticipant } from '../store/slices/interfaces/participant';
import { IMediaDevice } from '../store/slices/interfaces/roomSettings';

export type inputMediaDeviceKind = 'audio' | 'video' | 'both';

export const getInputMediaDevices = async (kind: inputMediaDeviceKind) => {
  // 1. Request permissions to get device labels.
  // This is necessary because browsers won't provide labels without permission.
  let stream: MediaStream | undefined;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: kind === 'audio' || kind === 'both',
      video: kind === 'video' || kind === 'both',
    });

    // 2. Enumerate devices now that we have permission.
    const devices = await navigator.mediaDevices.enumerateDevices();

    // 3. Filter and map devices into separate arrays.
    const audioDevices: IMediaDevice[] = [];
    const videoDevices: IMediaDevice[] = [];

    for (const device of devices) {
      // We only want devices with a deviceId.
      if (device.deviceId) {
        if (device.kind === 'audioinput') {
          audioDevices.push({ id: device.deviceId, label: device.label });
        } else if (device.kind === 'videoinput') {
          videoDevices.push({ id: device.deviceId, label: device.label });
        }
      }
    }

    return { audio: audioDevices, video: videoDevices };
  } finally {
    // 4. Clean up: stop all tracks to release the camera/mic.
    stream?.getTracks().forEach((track) => track.stop());
  }
};

const dec2hex = (dec) => {
  return dec.toString(16).padStart(2, '0');
};

export const randomString = (len = 20) => {
  const arr = new Uint8Array(len / 2);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, dec2hex).join('');
};

export const randomInteger = (len = 10) => {
  const arr = new Uint8Array(len / 2);
  window.crypto.getRandomValues(arr);
  return Number(arr.join(''));
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getWebcamResolution = () => {
  const selected = (window as any).DEFAULT_WEBCAM_RESOLUTION ?? 'h720';
  let resolution = VideoPresets.h720.resolution;

  switch (selected) {
    case 'h90':
      resolution = VideoPresets.h90.resolution;
      break;
    case 'h180':
      resolution = VideoPresets.h180.resolution;
      break;
    case 'h216':
      resolution = VideoPresets.h216.resolution;
      break;
    case 'h360':
      resolution = VideoPresets.h360.resolution;
      break;
    case 'h540':
      resolution = VideoPresets.h540.resolution;
      break;
    case 'h720':
      resolution = VideoPresets.h720.resolution;
      break;
    case 'h1080':
      resolution = VideoPresets.h1080.resolution;
      break;
    case 'h1440':
      resolution = VideoPresets.h1440.resolution;
      break;
    case 'h2160':
      resolution = VideoPresets.h2160.resolution;
      break;
  }

  return resolution;
};

export const getScreenShareResolution = () => {
  const selected =
    (window as any).DEFAULT_SCREEN_SHARE_RESOLUTION ?? 'h1080fps15';
  let resolution = ScreenSharePresets.h1080fps15.resolution;

  switch (selected) {
    case 'h360fps3':
      resolution = ScreenSharePresets.h360fps3.resolution;
      break;
    case 'h720fps5':
      resolution = ScreenSharePresets.h720fps5.resolution;
      break;
    case 'h720fps15':
      resolution = ScreenSharePresets.h720fps15.resolution;
      break;
    case 'h1080fps15':
      resolution = ScreenSharePresets.h1080fps15.resolution;
      break;
    case 'h1080fps30':
      resolution = ScreenSharePresets.h1080fps30.resolution;
      break;
  }

  return resolution;
};

export const getAudioPreset = () => {
  const selected = (window as any).DEFAULT_AUDIO_PRESET ?? 'music';
  let preset = AudioPresets.music;

  switch (selected) {
    case 'telephone':
      preset = AudioPresets.telephone;
      break;
    case 'speech':
      preset = AudioPresets.speech;
      break;
    case 'music':
      preset = AudioPresets.music;
      break;
    case 'musicStereo':
      preset = AudioPresets.musicStereo;
      break;
    case 'musicHighQuality':
      preset = AudioPresets.musicHighQuality;
      break;
    case 'musicHighQualityStereo':
      preset = AudioPresets.musicHighQualityStereo;
      break;
  }

  return preset;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1, c.length);
    }
    if (c.indexOf(nameEQ) === 0) {
      return c.substring(nameEQ.length, c.length);
    }
  }
  return null;
};

/**
 * getAccessToken will try to get token by the following:
 * from `access_token` GET/Search parameter from URL OR
 * from cookie name `pnm_access_token`
 * */
export const getAccessToken = () => {
  const urlSearchParams = new URLSearchParams(window.location.search);
  const accessToken = urlSearchParams.get('access_token');
  if (accessToken) {
    return accessToken;
  }

  // now let's check from cookies
  const tokenCookieName = 'pnm_access_token';
  return getCookie(tokenCookieName);
};

export const formatNatsError = (err: any) => {
  let msg = i18n.t('notifications.nats-error-request-failed').toString();

  if (err instanceof errors.NoRespondersError) {
    msg = i18n.t('notifications.nats-error-no-response', {
      error: `${err.name}: ${err.message}`,
    });
  } else if (err instanceof errors.TimeoutError) {
    msg = i18n.t('notifications.nats-error-timeout', {
      error: `${err.name}: ${err.message}`,
    });
  } else if (err instanceof Error) {
    msg = err.name + ': ' + msg;
    if (err.message !== '') {
      msg = err.name + ': ' + err.message;
    }
  }

  return msg;
};

export const getWhiteboardDonors = (): IParticipant[] => {
  const s = store.getState();
  const participants = participantsSelector
    .selectAll(s)
    .filter(
      (participant) => participant.userId !== s.session.currentUser?.userId,
    );

  if (!participants.length) return [];
  let donors: IParticipant[] = [];

  if (participants.length > 1) {
    // we can select one presenter
    const p = participants.filter((p) => p.metadata.isPresenter);
    if (p.length > 0) {
      donors.push(p[0]);
    }
    // now select one from other users
    const others = participants.filter((p) => !p.metadata.isPresenter);
    if (others.length > 0) {
      others.sort((a, b) => {
        return a.joinedAt - b.joinedAt;
      });
      // select another 1 user
      donors.push(others[0]);
    }
  } else {
    donors = participants;
  }

  return donors;
};

let emptyStreamTrack: MediaStreamTrack | undefined = undefined;
export function createEmptyVideoStreamTrack(name: string) {
  // Reuse the track only if it exists and is still live.
  if (emptyStreamTrack && emptyStreamTrack.readyState === 'live') {
    return emptyStreamTrack;
  }

  const canvas = document.createElement('canvas');
  canvas.width = VideoPresets.h720.resolution.width;
  canvas.height = VideoPresets.h720.resolution.height;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Set a black background for high contrast.
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const textString = generateAvatarInitial(name);

    // Style the text for clarity.
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 120px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(textString, canvas.width / 2, canvas.height / 2);
  }

  const canvasStream = canvas.captureStream();
  [emptyStreamTrack] = canvasStream.getVideoTracks();
  if (!emptyStreamTrack) {
    throw Error('Could not get empty media stream video track');
  }

  return emptyStreamTrack;
}

export const generateAvatarInitial = (name: string) => {
  const nameParts = name.trim().split(/\s+/);
  const firstNameInitial = nameParts[0]?.[0] || '';
  let lastNameInitial = '';

  if (nameParts.length > 1) {
    lastNameInitial = nameParts[nameParts.length - 1]?.[0] || '';
  } else if (nameParts[0]?.length > 1) {
    lastNameInitial = nameParts[0].slice(-1);
  }
  return `${firstNameInitial}${lastNameInitial}`.toLocaleUpperCase();
};

export const isUserRecorder = (userId: string) => {
  return userId === 'RECORDER_BOT' || userId === 'RTMP_BOT';
};
