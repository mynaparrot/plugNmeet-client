import { AudioPresets, ScreenSharePresets, VideoPresets } from 'livekit-client';
import { errors } from '@nats-io/nats-core';

import i18n from './i18n';
import { store } from '../store';
import { participantsSelector } from '../store/slices/participantSlice';
import { IParticipant } from '../store/slices/interfaces/participant';
import { IMediaDevice } from '../store/slices/interfaces/roomSettings';
import sanitizeHtml from 'sanitize-html';
import { RecorderBotOptions, RoomCreateFeatures } from 'plugnmeet-protocol-js';
import { PnmConnectionQuality } from './livekit/ConnectionQualityMonitor';

export type inputMediaDeviceKind = 'audio' | 'video' | 'both';

/**
 * A utility function to safely access values from the configuration.
 * It prioritizes the new `plugNmeetConfig` object, falls back to a legacy global variable,
 * and finally uses a provided default value.
 * @param key The key in the new `plugNmeetConfig` object (e.g., 'defaultWebcamResolution').
 * @param defaultValue An optional default value to return if no configuration is found.
 * @param legacyKey An optional legacy global variable name (e.g., 'DEFAULT_WEBCAM_RESOLUTION').
 * @returns The configuration value.
 */
export function getConfigValue<T>(
  key: string,
  defaultValue?: T,
  legacyKey?: string,
): T {
  const config = (window as any).plugNmeetConfig;

  // 1. Prioritize the new config object
  if (config && typeof config === 'object' && key in config) {
    const value = config[key];
    if (value !== undefined && value !== null) {
      return value as T;
    }
  }

  // 2. Fallback to legacy global variable if provided
  if (legacyKey) {
    const legacyConfig = window as any;
    if (
      legacyConfig &&
      typeof legacyConfig === 'object' &&
      legacyKey in legacyConfig
    ) {
      const value = legacyConfig[legacyKey];
      if (value !== undefined && value !== null) {
        return value as T;
      }
    }
  }

  // 3. Return the default value
  return defaultValue as T;
}

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
  const selected = getConfigValue<string>(
    'defaultWebcamResolution',
    'h720',
    'DEFAULT_WEBCAM_RESOLUTION',
  );
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
  const selected = getConfigValue<string>(
    'defaultScreenShareResolution',
    'h1080fps15',
    'DEFAULT_SCREEN_SHARE_RESOLUTION',
  );
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
  const selected = getConfigValue<string>(
    'defaultAudioPreset',
    'music',
    'DEFAULT_AUDIO_PRESET',
  );
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

/**
 * getChatDonors returns the two participants who joined the session earliest.
 */
export const getChatDonors = (): IParticipant[] => {
  const s = store.getState();
  const currentUserId = s.session.currentUser?.userId;
  const allParticipants = participantsSelector.selectAll(s);

  // Sort participants by their joinedAt timestamp in ascending order (earliest first).
  allParticipants.sort((a, b) => a.joinedAt - b.joinedAt);

  // Return the first two participants other than ourselves.
  return allParticipants.filter((p) => p.userId !== currentUserId).slice(0, 2);
};

export const generateAvatarInitial = (name: string) => {
  const trimmedName = name.trim();

  // Return nothing for empty names.
  if (!trimmedName) {
    return '';
  }

  // Strip parenthesized annotations such as "(Guest)" or "(Host)".
  const withoutParentheses = trimmedName.replace(/\([^)]*\)/g, ' ').trim();
  const cleanedName = withoutParentheses || trimmedName;

  // Check if the name contains any digits, which may indicate a phone number.
  if (/\d/.test(cleanedName)) {
    const firstChar = cleanedName[0] || '';
    const lastChar =
      cleanedName.length > 1 ? cleanedName[cleanedName.length - 1] : '';
    return `${firstChar}${lastChar}`.toLocaleUpperCase();
  }

  // Keep only tokens that contain at least one letter or number, so stray
  // punctuation (e.g. a leftover parenthesis) can't be used as an initial.
  const nameParts = cleanedName
    .split(/\s+/)
    .filter((part) => /[\p{L}\p{N}]/u.test(part));

  if (nameParts.length === 0) {
    return cleanedName[0]?.toLocaleUpperCase() ?? '';
  }

  if (nameParts.length === 1) {
    // Single name: use the first two letters ("Jibon" -> "JI").
    return nameParts[0].slice(0, 2).toLocaleUpperCase();
  }

  // Full name: use the first letter of the first and last meaningful words.
  const firstNameInitial = nameParts[0][0] ?? '';
  const lastNameInitial = nameParts[nameParts.length - 1][0] ?? '';
  return `${firstNameInitial}${lastNameInitial}`.toLocaleUpperCase();
};

export const isUserRecorder = (userId: string) => {
  return userId === 'RECORDER_BOT' || userId === 'RTMP_BOT';
};

export const isValidHttpUrl = (url: string) => {
  try {
    const newUrl = new URL(url);
    return newUrl.protocol === 'http:' || newUrl.protocol === 'https:';
  } catch (e) {
    console.info('Invalid logout URL:', e);
  }

  return false;
};

// for special case SIP
// our: sip_phoneNumber
// LK: sip_+phoneNumber
export const toPlugNmeetUserId = (userId: string) => {
  if (userId.startsWith('sip_')) {
    return userId.replace('+', '');
  }
  return userId;
};

// resolves a LiveKit identity to the PRIMARY plugNmeet user id:
// applies toPlugNmeetUserId, then strips the reserved native-twin suffix.
// e.g. "user1-native" -> "user1" (see HYBRID_INTEGRATION_ARCHITECTURE.md 6.1)
export const NATIVE_TWIN_SUFFIX = '-native';

export const toPlugNmeetUserIdPrimary = (userId: string) => {
  const id = toPlugNmeetUserId(userId);
  return id.endsWith(NATIVE_TWIN_SUFFIX)
    ? id.slice(0, id.length - NATIVE_TWIN_SUFFIX.length)
    : id;
};

// builds the LiveKit identity of the hybrid native twin for a primary user id
// (mirrors the server's config.GetNativeTwinIdentity)
export const toNativeTwinIdentity = (userId: string) =>
  `${userId}${NATIVE_TWIN_SUFFIX}`;

export const toLiveKitUserId = (userId: string) => {
  if (userId.startsWith('sip_')) {
    // if phone number hidden then SIP will send random userId
    // which basically don't need to add + sign
    if (
      !store.getState().session.currentRoom.metadata?.roomFeatures
        ?.sipDialInFeatures?.hidePhoneNumber
    ) {
      return userId.replace('sip_', 'sip_+');
    }
  }
  return userId;
};

export const isFirefoxMobile = () => {
  const ua = window.navigator.userAgent;
  const isFirefox = ua.includes('Firefox');
  const isMobile =
    ua.includes('Android') || ua.includes('Mobile') || ua.includes('Mobi');
  return isFirefox && isMobile;
};

export const cleanHtmlForChat = (rawText: string) => {
  return sanitizeHtml(rawText, {
    // Static markup only: no scripts, styles, event handlers or url-bearing
    // attributes beyond this list; svg/path is the static attachment icon.
    // prettier-ignore
    allowedTags: ['b', 'i', 'strong', 'em', 'del', 'br', 'hr', 'a', 'span', 'div', 'p', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'svg', 'path'],
    allowedAttributes: {
      a: ['href', 'target', 'class', 'title'],
      span: ['class', 'dir'],
      strong: ['class'],
      div: ['dir'],
      p: ['dir'],
      ul: ['dir'],
      ol: ['dir', 'start'],
      li: ['dir'],
      code: ['class', 'dir'],
      pre: ['dir'],
      blockquote: ['dir'],
      h1: ['dir'],
      h2: ['dir'],
      h3: ['dir'],
      h4: ['dir'],
      h5: ['dir'],
      h6: ['dir'],
      table: ['dir'],
      thead: ['dir'],
      tbody: ['dir'],
      tr: ['dir'],
      td: ['dir', 'align'],
      th: ['dir', 'align'],
      svg: ['xmlns', 'width', 'height', 'viewbox', 'fill'],
      // prettier-ignore
      path: [ 'd', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin' ],
    },
    // Class values are whitelisted: Tailwind utilities ship in the app bundle,
    // so arbitrary classes in chat markup could spoof the UI. The whitelist
    // covers the trusted senders: attachment card, linkified urls, poll card,
    // plus language-* emitted by our own fenced code formatter.
    // prettier-ignore
    allowedClasses: {
      a: ['attachment-message', 'flex', 'items-center', 'gap-3', 'break-all', 'text-[#24aef7]', 'hover:underline'],
      span: ['block', 'flex', 'items-center', 'justify-between', 'gap-3', 'min-w-0', 'flex-1', 'break-words', 'text-start', 'me-1', 'font-medium', 'text-Green-700', 'shrink-0', 'text-xs', 'text-Gray-600', 'text-Gray-700', 'dark:text-dark-text', 'mt-1.5', 'mt-2', 'border-t', 'border-Gray-200', 'pt-2', 'dark:border-Gray-700', 'h-10', 'w-10', 'rounded-xl', 'bg-Gray-50', 'justify-center'],
      strong: ['block', 'break-words', 'text-sm', 'font-semibold', 'text-Gray-950', 'dark:text-white'],
      code: [/^language-[a-z0-9+-]+$/],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  });
};

export const getRecorderBotOptions = (
  currentUserId: string,
  roomFeatures: RoomCreateFeatures,
): RecorderBotOptions | undefined => {
  switch (currentUserId) {
    case 'RECORDER_BOT':
      return roomFeatures?.recordingFeatures?.recorderBotOptions;
    case 'RTMP_BOT':
      return roomFeatures?.externalBroadcastingFeatures?.recorderBotOptions;
    default:
      return undefined;
  }
};

export const getConnectionQualityColor = (quality: PnmConnectionQuality) => {
  switch (quality) {
    case PnmConnectionQuality.Excellent:
      return '#22c55e';
    case PnmConnectionQuality.Good:
      return '#84cc16';
    case PnmConnectionQuality.Poor:
      return '#f97316';
    case PnmConnectionQuality.Lost:
      return '#ef4444';
    default:
      return '#9ca3af';
  }
};

export function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x2000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
