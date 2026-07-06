import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LocalTrackPublication, ParticipantEvent, Track } from 'livekit-client';
import { DataMsgBodyType } from 'plugnmeet-protocol-js';

import {
  IUseLocalRecordingReturn,
  RecordingEvent,
  RecordingType,
} from './IRecording';
import { store, useAppDispatch } from '../../../../store';
import { getMediaServerConnRoom } from '../../../../helpers/livekit/utils';
import { getNatsConn } from '../../../../helpers/nats';
import { addUserNotification } from '../../../../store/slices/roomSettingsSlice';
import { getSafeFileName, getSupportedMimeType } from './utils';

const useLocalRecording = (): IUseLocalRecordingReturn => {
  const currentRoom = getMediaServerConnRoom();
  const conn = getNatsConn();
  const dispatch = useAppDispatch();

  const [recordingEvent, setRecordingEvent] = useState<RecordingEvent>(
    RecordingEvent.NONE,
  );
  const [hasError, setHasError] = useState<boolean>(false);
  const [captureStream, setCaptureStream] = useState<MediaStream | null>(null);

  const captureStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const audioDest = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micSource = useRef<MediaStreamAudioSourceNode | null>(null);
  const screenAudioSource = useRef<MediaStreamAudioSourceNode | null>(null);
  const hasStartedRecordingRef = useRef<boolean>(false);

  const TYPE_OF_RECORDING = RecordingType.RECORDING_TYPE_LOCAL;
  const recordingData = useRef<Blob[]>([]);

  const session = store.getState().session;
  const { t } = useTranslation();

  const broadcastNotification = useCallback(
    (start = true) => {
      let msg = t('notifications.local-recording-ended', {
        name: session.currentUser?.name,
      });

      if (start) {
        msg = t('notifications.local-recording-started', {
          name: session.currentUser?.name,
        });
      }

      void conn.sendDataMessage(DataMsgBodyType.INFO, msg);
    },
    [conn, session.currentUser?.name, t],
  );

  const cleanupAudio = useCallback(async () => {
    if (micSource.current) {
      micSource.current.disconnect();
      micSource.current = null;
    }

    if (screenAudioSource.current) {
      screenAudioSource.current.disconnect();
      screenAudioSource.current = null;
    }

    if (audioCtx.current && audioCtx.current.state !== 'closed') {
      await audioCtx.current.close().catch(() => undefined);
    }

    audioCtx.current = null;
    audioDest.current = null;
  }, []);

  const cleanupRecording = useCallback(
    async (stopStream = true) => {
      if (stopStream && captureStreamRef.current) {
        captureStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      captureStreamRef.current = null;
      setCaptureStream(null);

      recorderRef.current = null;
      recordingData.current = [];
      hasStartedRecordingRef.current = false;

      await cleanupAudio();
    },
    [cleanupAudio],
  );

  useEffect(() => {
    const onTrackPublished = (track: LocalTrackPublication) => {
      if (
        track.source === Track.Source.Microphone &&
        track.track?.mediaStream &&
        audioCtx.current &&
        audioDest.current
      ) {
        // Prevent duplicate connections if mic is toggled mid-recording.
        if (micSource.current) {
          micSource.current.disconnect();
          micSource.current = null;
        }

        micSource.current = audioCtx.current.createMediaStreamSource(
          track.track.mediaStream,
        );
        micSource.current.connect(audioDest.current);
      }
    };

    const onTrackUnpublished = (track: LocalTrackPublication) => {
      if (track.source === Track.Source.Microphone && micSource.current) {
        micSource.current.disconnect();
        micSource.current = null;
      }
    };

    currentRoom.localParticipant.on(
      ParticipantEvent.LocalTrackPublished,
      onTrackPublished,
    );
    currentRoom.localParticipant.on(
      ParticipantEvent.LocalTrackUnpublished,
      onTrackUnpublished,
    );

    return () => {
      currentRoom.localParticipant.off(
        ParticipantEvent.LocalTrackPublished,
        onTrackPublished,
      );
      currentRoom.localParticipant.off(
        ParticipantEvent.LocalTrackUnpublished,
        onTrackUnpublished,
      );
    };
  }, [currentRoom]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      return;
    }

    void cleanupRecording(true);
  }, [cleanupRecording]);

  const startRecorder = useCallback(
    (stream: MediaStream) => {
      audioCtx.current = new AudioContext();

      // Ensure AudioContext is not blocked by browser autoplay policies.
      if (audioCtx.current.state === 'suspended') {
        void audioCtx.current.resume().catch(() => undefined);
      }

      audioDest.current = audioCtx.current.createMediaStreamDestination();

      if (stream.getAudioTracks().length) {
        screenAudioSource.current =
          audioCtx.current.createMediaStreamSource(stream);
        screenAudioSource.current.connect(audioDest.current);
      }

      const localTrack = currentRoom.localParticipant.getTrackPublication(
        Track.Source.Microphone,
      );

      if (localTrack?.audioTrack?.mediaStream) {
        if (micSource.current) {
          micSource.current.disconnect();
          micSource.current = null;
        }

        micSource.current = audioCtx.current.createMediaStreamSource(
          localTrack.audioTrack.mediaStream,
        );
        micSource.current.connect(audioDest.current);
      }

      const mimeType = getSupportedMimeType();

      if (!mimeType) {
        throw new Error('No supported MediaRecorder MIME type found');
      }

      const videoTrack = stream.getVideoTracks()[0];

      if (!videoTrack) {
        throw new Error('No video track found in display media stream');
      }

      const tracks: MediaStreamTrack[] = [videoTrack];

      /**
       * Always add the destination audio track.
       *
       * This is important because mic audio may be connected later via
       * ParticipantEvent.LocalTrackPublished. Since the recorder already has
       * this destination track, later-connected audio sources will be included.
       */
      const destinationAudioTrack =
        audioDest.current.stream.getAudioTracks()[0];

      if (destinationAudioTrack) {
        tracks.push(destinationAudioTrack);
      }

      const combinedStream = new MediaStream(tracks);
      const recorder = new MediaRecorder(combinedStream, { mimeType });
      const fileName = getSafeFileName(conn.roomId, mimeType);

      recorder.onstart = () => {
        hasStartedRecordingRef.current = true;

        setRecordingEvent(RecordingEvent.STARTED_RECORDING);
        setHasError(false);
        broadcastNotification(true);
      };

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordingData.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        setRecordingEvent(RecordingEvent.STOPPED_RECORDING);
        setHasError(false);

        const blobData = new Blob(recordingData.current, { type: mimeType });
        const url = URL.createObjectURL(blobData);
        const anchor = document.createElement('a');

        document.body.appendChild(anchor);
        anchor.style.display = 'none';
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();

        // Safe delay to ensure Safari/Firefox finish writing large files
        // before revocation.
        setTimeout(() => {
          URL.revokeObjectURL(url);
          anchor.remove();
        }, 1000);

        void cleanupRecording(true);
        broadcastNotification(false);
      };

      recorder.onerror = () => {
        const shouldBroadcastEnded = hasStartedRecordingRef.current;

        setHasError(true);
        void cleanupRecording(true);

        if (shouldBroadcastEnded) {
          broadcastNotification(false);
        }
      };

      recorderRef.current = recorder;

      // Using a timeslice helps avoid keeping all data buffered internally
      // until the recording stops.
      recorder.start(1000);
    },
    [broadcastNotification, cleanupRecording, currentRoom, conn.roomId],
  );

  const startRecording = useCallback(async () => {
    if (captureStreamRef.current || recorderRef.current) {
      return;
    }

    const displayMediaOptions: DisplayMediaStreamOptions & {
      preferCurrentTab?: boolean;
    } = {
      preferCurrentTab: true,
      video: true,
      audio: true,
    };

    try {
      const stream =
        await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

      captureStreamRef.current = stream;
      setCaptureStream(stream);

      startRecorder(stream);
    } catch (e) {
      const err = `Error: ${e}`;

      dispatch(
        addUserNotification({
          message: err,
          typeOption: 'info',
        }),
      );

      setHasError(true);

      // Important: if getDisplayMedia succeeded but startRecorder failed,
      // this will stop the captured screen tracks too.
      void cleanupRecording(true);
    }
  }, [cleanupRecording, dispatch, startRecorder]);

  // Handle native browser "Stop sharing" UI trigger.
  useEffect(() => {
    if (!captureStream) {
      return;
    }

    const onScreenShareEnded = () => {
      stopRecording();
    };

    const videoTrack = captureStream.getVideoTracks()[0];

    if (videoTrack) {
      videoTrack.addEventListener('ended', onScreenShareEnded);
    }

    return () => {
      if (videoTrack) {
        videoTrack.removeEventListener('ended', onScreenShareEnded);
      }
    };
  }, [captureStream, stopRecording]);

  // Clean unmount safety.
  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;

      if (recorder && recorder.state !== 'inactive') {
        // Strip event callbacks to prevent state updates or network dispatches
        // after unmount. This means active recording is discarded on unmount.
        recorder.onstop = null;
        recorder.onerror = null;
        recorder.stop();
      }

      void cleanupRecording(true);
    };
  }, [cleanupRecording]);

  const resetError = () => {
    if (hasError) {
      setHasError(false);
    }
  };

  return {
    TYPE_OF_RECORDING,
    recordingEvent,
    hasError,
    startRecording,
    stopRecording,
    resetError,
  };
};

export default useLocalRecording;
