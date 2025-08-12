import { CloudRecordingVariants } from 'plugnmeet-protocol-js';

export enum RecordingEvent {
  NONE = 'none',
  STARTED_RECORDING = 'started_recording',
  STOPPING_RECORDING = 'STOPPING_RECORDING',
  STOPPED_RECORDING = 'stopped_recording',
}

export enum RecordingType {
  RECORDING_TYPE_NONE = 'none',
  RECORDING_TYPE_LOCAL = 'local',
  RECORDING_TYPE_CLOUD = 'cloud',
}

export interface IUseLocalRecordingReturn {
  TYPE_OF_RECORDING: RecordingType;
  recordingEvent: RecordingEvent;
  hasError: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  resetError: () => void;
}

export interface IUseCloudRecordingReturn {
  TYPE_OF_RECORDING: RecordingType;
  hasError: boolean;
  startRecording: (variant?: CloudRecordingVariants) => Promise<void>;
  stopRecording: () => Promise<void>;
  resetError: () => void;
}

export interface SelectedRecordingType {
  type: RecordingType;
  variant?: CloudRecordingVariants;
}
