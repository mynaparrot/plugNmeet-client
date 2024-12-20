import { AudioPresets, ScreenSharePresets, VideoPresets } from 'livekit-client';
import { errors } from '@nats-io/nats-core';
import { toast, TypeOptions } from 'react-toastify';

import i18n from './i18n';
import { store } from '../store';
import { participantsSelector } from '../store/slices/participantSlice';
import { IParticipant } from '../store/slices/interfaces/participant';

export async function getDevices(kind: MediaDeviceKind) {
  let constraints: MediaStreamConstraints = {
    audio: true,
  };
  if (kind === 'videoinput') {
    constraints = {
      video: true,
    };
  }
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  let devices = await navigator.mediaDevices.enumerateDevices();
  devices = devices.filter((device) => device.kind === kind);

  if (devices.length > 1 && devices[0].deviceId === 'default') {
    // find another device with matching group id, and move that to 0
    const defaultDevice = devices[0];
    for (let i = 1; i < devices.length; i += 1) {
      if (devices[i].groupId === defaultDevice.groupId) {
        const temp = devices[0];
        devices[0] = devices[i];
        devices[i] = temp;
        break;
      }
    }
    return devices.filter((device) => device !== defaultDevice);
  }

  stream.getTracks().forEach(function (track) {
    track.stop();
  });

  return devices;
}

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

export const displayInstantNotification = (
  message: string,
  type: TypeOptions,
) => {
  toast(message, {
    toastId: type + '-status',
    type,
  });

  const isPNMWindowTabVisible =
    store.getState().roomSettings.isPNMWindowTabVisible;
  // if not visible, then we can show notification
  if (
    !isPNMWindowTabVisible &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    // we'll see if website has any favicon icon, then we'll use it
    const favicon = document.querySelector("link[rel*='icon']");
    let icon: string | undefined = undefined;
    if (favicon) {
      icon = favicon.getAttribute('href') ?? undefined;
    }
    new Notification(message, { icon });
  }
};
