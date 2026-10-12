import { describe, expect, it } from 'vitest';

import { IMediaDevice } from '../../../../../store/slices/interfaces/roomSettings';
import {
  getFirstRealAudioDeviceId,
  getFirstStrictlyRealAudioDeviceId,
  resolveInitialDeviceId,
  resolveStoredOrFirstRealAudio,
  sortAudioDevices,
} from '../deviceUtils';

const dev = (id: string, label: string): IMediaDevice => ({ id, label });

describe('resolveInitialDeviceId', () => {
  it('a stored id wins while the device still exists', () => {
    const sorted = [
      dev('real-1', 'MacBook Pro Microphone'),
      dev('real-2', 'USB Microphone'),
      dev('vt-1', 'OBS Virtual Cable'),
    ];
    expect(resolveInitialDeviceId(sorted, 'real-2')).toBe('real-2');
  });

  it('returns "" when the stored id no longer exists', () => {
    const sorted = [dev('real-1', 'MacBook Pro Microphone')];
    expect(resolveInitialDeviceId(sorted, 'unplugged-1')).toBe('');
  });

  it('returns "" when nothing was stored', () => {
    const sorted = [dev('real-1', 'MacBook Pro Microphone')];
    expect(resolveInitialDeviceId(sorted, null)).toBe('');
  });
});

describe('getFirstStrictlyRealAudioDeviceId', () => {
  it('pre-selects the first strictly-real hardware mic, skipping system default + virtual entries', () => {
    const sorted = [
      dev('default', 'Default – MacBook Pro Microphone'),
      dev('vt-1', 'OBS Virtual Cable'),
      dev('real-1', 'MacBook Pro Microphone'),
      dev('real-2', 'USB Microphone'),
    ];
    expect(getFirstStrictlyRealAudioDeviceId(sorted)).toBe('real-1');
    expect(getFirstStrictlyRealAudioDeviceId(sorted)).not.toBe('vt-1');
  });

  it('never falls back to devices[0] when that entry is virtual or the system default', () => {
    const sorted = [dev('default', 'Default – Speakers'), dev('vt-1', 'VB-Audio Cable')];
    expect(getFirstStrictlyRealAudioDeviceId(sorted)).toBe('');
  });

  it('returns "" when every device is virtual or the system default (explicit user choice)', () => {
    const sorted = [
      dev('default', 'Default – Speakers'),
      dev('vt-1', 'Stereo Mix'),
      dev('vt-2', 'Voicemeeter Input'),
    ];
    expect(getFirstStrictlyRealAudioDeviceId(sorted)).toBe('');
  });

  it('returns "" for an empty list', () => {
    expect(getFirstStrictlyRealAudioDeviceId([])).toBe('');
  });

  it('works on the sorted order produced by sortAudioDevices', () => {
    const sorted = sortAudioDevices([
      dev('vt-1', 'OBS Virtual Cable'),
      dev('real-1', 'MacBook Pro Microphone'),
      dev('default', 'Default – MacBook Pro Microphone'),
    ]);
    expect(getFirstStrictlyRealAudioDeviceId(sorted)).toBe('real-1');
  });
});

describe('unchanged landing quick-enable fallback behavior', () => {
  it('getFirstRealAudioDeviceId still falls back to sorted[0] so quick-enable works on virtual-only rigs', () => {
    const sorted = [dev('vt-1', 'OBS Virtual Cable'), dev('default', 'Default – Speakers')];
    expect(getFirstRealAudioDeviceId(sorted)).toBe('vt-1');
  });

  it('resolveStoredOrFirstRealAudio still wins with a valid stored id and falls back to the first device otherwise', () => {
    const sorted = [dev('vt-1', 'OBS Virtual Cable'), dev('default', 'Default – Speakers')];
    expect(resolveStoredOrFirstRealAudio(sorted, 'vt-1')).toBe('vt-1');
    expect(resolveStoredOrFirstRealAudio(sorted, 'stale-id')).toBe('vt-1');
    const oneReal = [dev('real-1', 'MacBook Pro Microphone'), dev('vt-1', 'OBS Virtual Cable')];
    expect(resolveStoredOrFirstRealAudio(oneReal, 'stale-id')).toBe('real-1');
  });
});
