import { useState } from 'react';
import { LocalParticipant, Track } from 'livekit-client';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import {
  IUseLocalRecordingReturn,
  RecordingEvent,
  RecordingType,
} from './IRecording';
import {
  DataMessage,
  DataMsgBodyType,
  DataMsgType,
} from '../../../../helpers/proto/plugnmeet_datamessage_pb';
import { store } from '../../../../store';
import { sendWebsocketMessage } from '../../../../helpers/websocket';

const useLocalRecording = (
  localParticipant: LocalParticipant,
  roomId: string,
): IUseLocalRecordingReturn => {
  const [recordingEvent, setRecordingEvent] = useState<RecordingEvent>(
    RecordingEvent.NONE,
  );
  const [hasError, setHasError] = useState<boolean>(false);
  const [captureStream, setCaptureStream] = useState<MediaStream | null>(null);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);

  const TYPE_OF_RECORDING = RecordingType.RECORDING_TYPE_LOCAL;
  let recordingData: Array<Blob> = [];
  const displayMediaOptions = {
    preferCurrentTab: true,
    video: true,
    audio: true,
  };
  const session = store.getState().session;
  const { t } = useTranslation();

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
      toast(err, {
        toastId: 'recording-status',
        type: 'error',
      });
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

  const startRecorder = (captureStream: MediaStream) => {
    const date = new Date();
    const fileName = `${roomId}_${date.toLocaleString()}`;

    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();

    if (captureStream.getAudioTracks().length) {
      ctx.createMediaStreamSource(captureStream).connect(dest);
    }

    const localTrack = localParticipant.getTrack(Track.Source.Microphone);
    if (localTrack?.audioTrack?.mediaStream) {
      ctx
        .createMediaStreamSource(localTrack?.audioTrack?.mediaStream)
        .connect(dest);
    }

    let mimeType = 'video/webm';
    if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
      mimeType = 'video/mp4';
    }

    const videoTrack = captureStream.getVideoTracks()[0];
    const streams = [videoTrack];

    if (dest.stream.getTracks().length) {
      const mixedTracks = dest.stream.getTracks()[0];
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
      recordingData.push(e.data);
    };

    recorder.onstop = () => {
      setRecordingEvent(RecordingEvent.STOPPED_RECORDING);
      setHasError(false);

      const blobData = new Blob(recordingData, { type: mimeType });
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
      recordingData = [];
      broadcastNotification(false);
    };

    recorder.onerror = () => {
      setHasError(true);
      if (captureStream) {
        captureStream?.getTracks().forEach((track) => track.stop());
        setCaptureStream(null);
      }
      setRecorder(null);
      recordingData = [];
    };

    recorder.start();
    setRecorder(recorder);
  };

  const broadcastNotification = (start = true) => {
    const data: any = {
      type: DataMsgType.SYSTEM,
      roomSid: session.currentRoom.sid,
      roomId: session.currentRoom.room_id,
      body: {
        type: DataMsgBodyType.INFO,
        from: {
          sid: session.currentUser?.sid,
          userId: session.currentUser?.userId,
        },
      },
    };

    if (start) {
      data.body.msg = t('notifications.local-recording-started', {
        name: session.currentUser?.name,
      });
    } else {
      data.body.msg = t('notifications.local-recording-ended', {
        name: session.currentUser?.name,
      });
    }

    const dataMsg = new DataMessage(data);
    sendWebsocketMessage(dataMsg.toBinary());
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
