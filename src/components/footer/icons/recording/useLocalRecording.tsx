import { useEffect, useRef, useState } from 'react';
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

const useLocalRecording = (): IUseLocalRecordingReturn => {
  const currentRoom = getMediaServerConnRoom();
  const conn = getNatsConn();
  const dispatch = useAppDispatch();

  const [recordingEvent, setRecordingEvent] = useState<RecordingEvent>(
    RecordingEvent.NONE,
  );
  const [hasError, setHasError] = useState<boolean>(false);
  const [captureStream, setCaptureStream] = useState<MediaStream | null>(null);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const audioDest = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micSource = useRef<MediaStreamAudioSourceNode | null>(null);

  const TYPE_OF_RECORDING = RecordingType.RECORDING_TYPE_LOCAL;
  const recordingData = useRef<Blob[]>([]);
  const displayMediaOptions = {
    preferCurrentTab: true,
    video: true,
    audio: true,
  };
  const session = store.getState().session;
  const { t } = useTranslation();

  useEffect(() => {
    const onTrackPublished = (track: LocalTrackPublication) => {
      if (
        track.source === Track.Source.Microphone &&
        track.track?.mediaStream &&
        audioCtx.current &&
        audioDest.current
      ) {
        // if mic is enabled after recording started
        micSource.current = audioCtx.current.createMediaStreamSource(
          track.track.mediaStream,
        );
        micSource.current.connect(audioDest.current);
      }
    };
    const onTrackUnpublished = (track: LocalTrackPublication) => {
      if (track.source === Track.Source.Microphone && micSource.current) {
        micSource.current.disconnect();
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

  const startRecording = async () => {
    if (captureStream) {
      return;
    }
    try {
      const captureStream =
        await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      setCaptureStream(captureStream);
      startRecorder(captureStream);
    } catch (e) {
      const err = `Error: ${e}`;
      dispatch(
        addUserNotification({
          message: err,
          typeOption: 'info',
        }),
      );
      setHasError(true);
      setCaptureStream(null);
    }
  };

  const stopRecording = () => {
    if (recorder) {
      recorder.stop();
    }

    if (captureStream) {
      captureStream?.getTracks().forEach((track) => track.stop());
      setCaptureStream(null);
    }
  };

  // if the user stops sharing screen from the browser UI
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
    //oxlint-disable-next-line
  }, [captureStream]);

  const startRecorder = (captureStream: MediaStream) => {
    const date = new Date();
    const fileName = `${conn.roomId}_${date.toLocaleString()}`;

    audioCtx.current = new AudioContext();
    audioDest.current = audioCtx.current.createMediaStreamDestination();

    if (captureStream.getAudioTracks().length) {
      audioCtx.current
        .createMediaStreamSource(captureStream)
        .connect(audioDest.current);
    }

    const localTrack = currentRoom.localParticipant.getTrackPublication(
      Track.Source.Microphone,
    );
    if (localTrack?.audioTrack?.mediaStream) {
      micSource.current = audioCtx.current.createMediaStreamSource(
        localTrack.audioTrack.mediaStream,
      );
      micSource.current.connect(audioDest.current);
    }

    let mimeType = 'video/webm';
    if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
      mimeType = 'video/mp4';
    }

    const videoTrack = captureStream.getVideoTracks()[0];
    const streams = [videoTrack];

    if (audioDest.current.stream.getTracks().length) {
      const mixedTracks = audioDest.current.stream.getTracks()[0];
      streams.push(mixedTracks);
    }

    const combineStreams = new MediaStream(streams);
    const recorder = new MediaRecorder(combineStreams, {
      mimeType,
    });

    recorder.onstart = () => {
      setRecordingEvent(RecordingEvent.STARTED_RECORDING);
      setHasError(false);
      broadcastNotification(true);
    };

    recorder.ondataavailable = (e) => {
      recordingData.current.push(e.data);
    };

    recorder.onstop = () => {
      setRecordingEvent(RecordingEvent.STOPPED_RECORDING);
      setHasError(false);

      const blobData = new Blob(recordingData.current, { type: mimeType });
      const url = URL.createObjectURL(blobData);
      const a: any = document.createElement('a');
      document.body.appendChild(a);
      a.style = 'display: none';
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);

      // mostly happen if user close sharing directly
      if (captureStream) {
        captureStream?.getTracks().forEach((track) => track.stop());
        setCaptureStream(null);
      }

      setRecorder(null);
      recordingData.current = [];
      if (audioCtx.current && audioCtx.current.state !== 'closed') {
        audioCtx.current.close().then(() => {
          audioCtx.current = null;
          audioDest.current = null;
        });
      }
      broadcastNotification(false);
    };

    recorder.onerror = () => {
      setHasError(true);
      if (captureStream) {
        captureStream?.getTracks().forEach((track) => track.stop());
        setCaptureStream(null);
      }
      setRecorder(null);
      recordingData.current = [];
      if (audioCtx.current && audioCtx.current.state !== 'closed') {
        audioCtx.current.close().then(() => {
          audioCtx.current = null;
          audioDest.current = null;
        });
      }
    };

    recorder.start();
    setRecorder(recorder);
  };

  const broadcastNotification = (start = true) => {
    let msg = t('notifications.local-recording-ended', {
      name: session.currentUser?.name,
    });

    if (start) {
      msg = t('notifications.local-recording-started', {
        name: session.currentUser?.name,
      });
    }
    conn.sendDataMessage(DataMsgBodyType.INFO, msg);
  };

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
