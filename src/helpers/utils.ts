import { AudioPresets, ScreenSharePresets, VideoPresets } from 'livekit-client';
import { errors } from '@nats-io/nats-core';
import { toast, TypeOptions } from 'react-toastify';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  UploadBase64EncodedDataReqSchema,
  UploadBase64EncodedDataResSchema,
} from 'plugnmeet-protocol-js';
import Resumable from 'resumablejs';
import ResumableFile = Resumable.ResumableFile;

import i18n from './i18n';
import { store } from '../store';
import { participantsSelector } from '../store/slices/participantSlice';
import { IParticipant } from '../store/slices/interfaces/participant';
import { IMediaDevice } from '../store/slices/interfaces/roomSettings';
import sendAPIRequest from './api/plugNmeetAPI';
import { IUseResumableFilesUploadResult } from './hooks/useResumableFilesUpload';

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

  const tracks = stream.getTracks();
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    track.stop();
  }

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

let emptyStreamTrack: MediaStreamTrack | undefined = undefined;
export function createEmptyVideoStreamTrack(name: string) {
  if (typeof emptyStreamTrack !== 'undefined') {
    return emptyStreamTrack;
  }

  const canvas = document.createElement('canvas');
  canvas.width = VideoPresets.h720.resolution.width;
  canvas.height = VideoPresets.h720.resolution.height;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    const textString = name.toUpperCase().slice(0, 2);
    ctx.fillStyle = '#fff';
    ctx.font = '120px san-serif';
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

export const isUserRecorder = (userId: string) => {
  return userId === 'RECORDER_BOT' || userId === 'RTMP_BOT';
};

export const uploadBase64EncodedFile = async (
  fileName: string,
  base64EncodedData: string,
) => {
  const id = toast.loading(i18n.t('notifications.uploading-file'), {
    type: 'info',
  });
  const parts = base64EncodedData.split('base64,');
  const body = create(UploadBase64EncodedDataReqSchema, {
    data: parts[1],
    fileName,
  });
  const r = await sendAPIRequest(
    'uploadBase64EncodedData',
    toBinary(UploadBase64EncodedDataReqSchema, body),
    false,
    'application/protobuf',
    'arraybuffer',
  );

  const res = fromBinary(UploadBase64EncodedDataResSchema, new Uint8Array(r));
  if (!res.status) {
    toast.update(id, {
      render: res.msg,
      type: 'error',
      isLoading: false,
      autoClose: 3000,
    });
    return undefined;
  }

  toast.update(id, {
    render: i18n.t('right-panel.file-upload-success'),
    type: 'success',
    isLoading: false,
    autoClose: 1000,
  });

  return res;
};

let isUploadingFile = false,
  toastId = '';
export const uploadResumableFile = (
  allowedFileTypes: Array<string>,
  maxFileSize: string | undefined,
  files: Array<File>,
  onSuccess: (result: IUseResumableFilesUploadResult) => void,
  isUploading?: (uploading: boolean) => void,
) => {
  if (isUploadingFile) {
    toast(i18n.t('notifications.please-wait-other-task-to-finish'), {
      type: 'info',
      autoClose: 3000,
    });
    return;
  }

  isUploadingFile = true;
  const session = store.getState().session;
  let fileName = '';

  const r = new Resumable({
    target: (window as any).PLUG_N_MEET_SERVER_URL + '/api/fileUpload',
    uploadMethod: 'POST',
    query: {
      roomSid: session.currentRoom.sid,
      roomId: session.currentRoom.roomId,
      userId: session.currentUser?.userId,
      resumable: true,
    },
    headers: {
      Authorization: session.token,
    },
    prioritizeFirstAndLastChunk: true,

    fileType: allowedFileTypes,
    fileTypeErrorCallback(file) {
      const extension = file.name.slice(
        ((file.name.lastIndexOf('.') - 1) >>> 0) + 2,
      );
      toast(
        i18n.t('notifications.file-type-not-allow', { filetype: extension }),
        {
          type: 'error',
        },
      );
      isUploadingFile = false;
    },

    // @ts-expect-error actually value exist
    maxFileSize: maxFileSize ? Number(maxFileSize) * 1000000 : undefined,
    maxFileSizeErrorCallback() {
      toast(i18n.t('notifications.max-file-size-exceeds'), {
        type: 'error',
      });
      isUploadingFile = false;
    },
  });

  r.on('fileAdded', function (file) {
    fileName = file.fileName;
    if (!r.isUploading()) {
      if (isUploading) {
        isUploading(true);
      }
      r.upload();
    }
  });

  r.on('fileSuccess', async (file: ResumableFile) => {
    // file was uploaded successfully
    // now we'll send merge request
    const mergeReq = {
      roomSid: session.currentRoom.sid,
      roomId: session.currentRoom.roomId,
      resumableIdentifier: file.uniqueIdentifier,
      resumableFilename: file.fileName,
      resumableTotalChunks: file.chunks.length,
    };
    const res = await sendAPIRequest('/uploadedFileMerge', mergeReq, true);

    if (isUploading) {
      isUploading(false);
    }
    isUploadingFile = false;

    setTimeout(() => {
      toast.dismiss(toastId);
    }, 300);

    if (res.status && res.filePath && res.fileName) {
      onSuccess({
        filePath: res.filePath,
        fileName: res.fileName,
        fileExtension: res.fileExtension,
      });
    } else {
      toast(i18n.t(res.msg), {
        type: 'error',
      });
    }
  });

  r.on('fileError', function (file, message) {
    isUploadingFile = false;
    if (isUploading) {
      isUploading(false);
    }

    setTimeout(() => {
      toast.dismiss(toastId);
    }, 300);

    try {
      const res = JSON.parse(message);
      toast(i18n.t(res.msg), {
        type: 'error',
      });
    } catch (e) {
      console.error(e);
      toast(i18n.t('right-panel.file-upload-default-error'), {
        type: 'error',
      });
    }
  });

  r.on('uploadStart', function () {
    // @ts-expect-error this value exists
    toastId = toast(
      i18n.t('right-panel.uploading-file', {
        fileName,
      }),
      {
        closeButton: false,
        progress: 0,
      },
    );
  });

  r.on('fileProgress', function (file) {
    const progress = file.progress(false);
    toast.update(toastId, {
      progress: Number(progress),
    });
  });

  r.addFiles(files);
};
