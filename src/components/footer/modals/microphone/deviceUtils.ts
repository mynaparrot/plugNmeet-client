import {
  DeviceSessionStorageKeys,
  IMediaDevice,
} from '../../../../store/slices/interfaces/roomSettings';

const VIRTUAL_HINT =
  /monitor|loopback|virtual|vb-audio|voicemeeter|cable|obs|manycam|snap|krisp|nvidia broadcast|rtx voice|stereo mix|what u hear/i;

export const isLikelyVirtualOrLoopback = (label: string) =>
  VIRTUAL_HINT.test(label || '');

export const isSystemDefaultDevice = (device: IMediaDevice) =>
  device.id === 'default' || /^default/i.test(device.label || '');

/**
 * Never auto-pick devices[0] — it is often a monitor/loopback or a stale
 * "Default" mapping, which is exactly the "others can't hear me" bug.
 * Only restore an explicitly stored id if it still exists.
 */
export const resolveInitialDeviceId = (
  devices: IMediaDevice[],
  storedId?: string | null,
): string => {
  if (storedId && devices.some((d) => d.id === storedId)) {
    return storedId;
  }
  return '';
};

export const getStoredAudioDeviceId = (): string | null => {
  try {
    return sessionStorage.getItem(DeviceSessionStorageKeys.AUDIO_DEVICE);
  } catch {
    return null;
  }
};

/** Physical mics first, then system default, then virtual/loopback last. */
export const sortAudioDevices = (devices: IMediaDevice[]): IMediaDevice[] => {
  return [...devices].sort((a, b) => {
    const aVirtual = isLikelyVirtualOrLoopback(a.label) ? 1 : 0;
    const bVirtual = isLikelyVirtualOrLoopback(b.label) ? 1 : 0;
    if (aVirtual !== bVirtual) {
      return aVirtual - bVirtual;
    }
    const aDef = isSystemDefaultDevice(a) ? 1 : 0;
    const bDef = isSystemDefaultDevice(b) ? 1 : 0;
    if (aDef !== bDef) {
      return aDef - bDef;
    }
    return (a.label || '').localeCompare(b.label || '');
  });
};

const VIRTUAL_CAM_HINT =
  /virtual|obs|manycam|snap camera|xsplit|streamlabs|droidcam|epoccam|ivcam|vcam|fake/i;
const IR_CAM_HINT = /infrared|\bir\b|windows hello|hello face/i;

export const isLikelyVirtualCamera = (label: string) =>
  VIRTUAL_CAM_HINT.test(label || '') || IR_CAM_HINT.test(label || '');

/** Physical cameras first, then system default, then virtual/IR last. */
export const sortVideoDevices = (devices: IMediaDevice[]): IMediaDevice[] => {
  return [...devices].sort((a, b) => {
    const aVirtual = isLikelyVirtualCamera(a.label) ? 1 : 0;
    const bVirtual = isLikelyVirtualCamera(b.label) ? 1 : 0;
    if (aVirtual !== bVirtual) {
      return aVirtual - bVirtual;
    }
    const aDef = isSystemDefaultDevice(a) ? 1 : 0;
    const bDef = isSystemDefaultDevice(b) ? 1 : 0;
    if (aDef !== bDef) {
      return aDef - bDef;
    }
    return (a.label || '').localeCompare(b.label || '');
  });
};

export const getStoredVideoDeviceId = (): string | null => {
  try {
    return sessionStorage.getItem(DeviceSessionStorageKeys.VIDEO_DEVICE);
  } catch {
    return null;
  }
};

/**
 * First real (non-virtual, non-default) id from an already-sorted list.
 * Falls back to the first entry so quick-enable still works when every
 * device looks virtual (e.g. single OBS camera).
 */
export const getFirstRealAudioDeviceId = (sorted: IMediaDevice[]): string => {
  const real = sorted.find(
    (d) => !isLikelyVirtualOrLoopback(d.label) && !isSystemDefaultDevice(d),
  );
  return real?.id ?? sorted[0]?.id ?? '';
};

export const getFirstRealVideoDeviceId = (sorted: IMediaDevice[]): string => {
  const real = sorted.find(
    (d) => !isLikelyVirtualCamera(d.label) && !isSystemDefaultDevice(d),
  );
  return real?.id ?? sorted[0]?.id ?? '';
};

/**
 * Stored id wins when still plugged in, otherwise first real device.
 * Used by landing "Enable mic+cam" quick path (no popup).
 */
export const resolveStoredOrFirstRealAudio = (
  sorted: IMediaDevice[],
  storedId?: string | null,
): string => {
  if (storedId && sorted.some((d) => d.id === storedId)) {
    return storedId;
  }
  return getFirstRealAudioDeviceId(sorted);
};

export const resolveStoredOrFirstRealVideo = (
  sorted: IMediaDevice[],
  storedId?: string | null,
): string => {
  if (storedId && sorted.some((d) => d.id === storedId)) {
    return storedId;
  }
  return getFirstRealVideoDeviceId(sorted);
};
