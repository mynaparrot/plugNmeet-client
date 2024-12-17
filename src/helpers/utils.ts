import { AudioPresets, ScreenSharePresets, VideoPresets } from 'livekit-client';
import { errors } from '@nats-io/nats-core';

import i18n from './i18n';
import { store } from '../store';
import { participantsSelector } from '../store/slices/participantSlice';
import { IParticipant } from '../store/slices/interfaces/participant';
import { IMediaDevice } from '../store/slices/interfaces/roomSettings';

export type inputMediaDeviceKind = 'audio' | 'video' | 'both';

export const getInputMediaDevices = async (kind: inputMediaDeviceKind) => {
  const constraints: MediaStreamConstraints = {
    audio: false,
    video: false,
  };
  if (kind === 'audio') {
    constraints.audio = true;
  } else if (kind === 'video') {
    constraints.video = true;
  } else {
    constraints.audio = true;
    constraints.video = true;
  }

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  const devices = await navigator.mediaDevices.enumerateDevices();

  const audioDevices: IMediaDevice[] = [];
  const videoDevices: IMediaDevice[] = [];

  for (let i = 0; i < devices.length; i++) {
    const device = devices[i];
    if (device.deviceId === '') {
      continue;
    }
    if (device.kind === 'audioinput') {
      const exist = audioDevices.find((d) => d.id === device.deviceId);
      if (!exist) {
        audioDevices.push({
          id: device.deviceId,
          label: device.label,
        });
      }
    } else if (device.kind === 'videoinput') {
      const exist = videoDevices.find((d) => d.id === device.deviceId);
      if (!exist) {
        videoDevices.push({
          id: device.deviceId,
          label: device.label,
        });
      }
    }
  }

  stream.getTracks().forEach(function (track) {
    track.stop();
  });

  return {
    audio: audioDevices,
    video: videoDevices,
  };
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

/**
 * getAccessToken will try to get token by the following:
 * from `access_token` GET/Search parameter from URL OR
 * from cookie name `pnm_access_token`
 * */
export const getAccessToken = () => {
  const urlSearchParams = new URLSearchParams(window.location.search);
  let accessToken = urlSearchParams.get('access_token');
  if (accessToken) {
    return accessToken;
  }

  // now let's check from cookies
  const tokenCookieName = 'pnm_access_token';
  accessToken =
    document.cookie
      .match('(^|;)\\s*' + tokenCookieName + '\\s*=\\s*([^;]+)')
      ?.pop() || '';

  if (accessToken) {
    return accessToken;
  }

  return null;
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

export function createDummyVideoStreamTrack(
  width: number = 16,
  height: number = 16,
  enabled: boolean = false,
  paintContent: boolean = false,
) {
  const canvas = document.createElement('canvas');
  // the canvas size is set to 16 by default, because electron apps seem to fail with smaller values
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx?.fillRect(0, 0, canvas.width, canvas.height);
  if (paintContent && ctx) {
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = 'grey';
    ctx.fill();
  }
  const dummyStream = canvas.captureStream();
  const [dummyTrack] = dummyStream.getTracks();
  if (!dummyTrack) {
    throw Error('Could not get empty media stream video track');
  }
  dummyTrack.enabled = enabled;

  return dummyTrack;
}
