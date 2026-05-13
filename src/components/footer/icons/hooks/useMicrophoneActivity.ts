import { useCallback, useEffect, useRef, useState } from 'react';
import { AnalyticsEvents, AnalyticsEventType } from 'plugnmeet-protocol-js';
import {
  createAudioAnalyser,
  LocalAudioTrack,
  LocalTrackPublication,
  ParticipantEvent,
  Room,
  Track,
  TrackPublication,
} from 'livekit-client';

import { getNatsConn } from '../../../../helpers/nats';
import { sleep } from '../../../../helpers/utils';
import { store, useAppDispatch } from '../../../../store';
import {
  updateIsActiveMicrophone,
  updateIsMicMuted,
} from '../../../../store/slices/bottomIconsActivitySlice';
import { updateSelectedAudioDevice } from '../../../../store/slices/roomSettingsSlice';

export const useMicrophoneActivity = (
  currentRoom: Room | undefined,
  isMicMuted: boolean,
) => {
  const conn = getNatsConn();
  const dispatch = useAppDispatch();
  const [showMutedTooltip, setShowMutedTooltip] = useState<boolean>(false);

  const tooltipDismissedRef = useRef(<boolean>false);
  const isMutedRef = useRef<boolean>(isMicMuted);
  const muteDelayTimer = useRef<NodeJS.Timeout | null>(null);
  const muteOnStartRef = useRef(
    !!store.getState().session.currentRoom.metadata?.roomFeatures?.muteOnStart,
  );
  const intervalRef = useRef<any>(null);
  const cleanupAnalyserRef = useRef<(() => void) | undefined>(undefined);

  const speakingHandler = useCallback(
    (speaking: boolean) => {
      if (!currentRoom) {
        return;
      }
      if (!speaking) {
        const lastSpokeAt = currentRoom.localParticipant.lastSpokeAt?.getTime();
        if (lastSpokeAt) {
          const cal = Date.now() - lastSpokeAt;
          // send analytics
          conn.sendAnalyticsData(
            AnalyticsEvents.ANALYTICS_EVENT_USER_TALKED_DURATION,
            AnalyticsEventType.USER,
            undefined,
            undefined,
            cal.toString(),
          );
        }
      } else {
        // send analytics as user has spoken
        conn.sendAnalyticsData(
          AnalyticsEvents.ANALYTICS_EVENT_USER_TALKED,
          AnalyticsEventType.USER,
          undefined,
          undefined,
          '1',
        );
      }
    },
    [currentRoom, conn],
  );

  const teardownAnalyser = useCallback(async () => {
    if (muteDelayTimer.current) {
      clearTimeout(muteDelayTimer.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (cleanupAnalyserRef.current) {
      cleanupAnalyserRef.current();
      cleanupAnalyserRef.current = undefined;
    }
    await sleep(200);
    setShowMutedTooltip(false);
    tooltipDismissedRef.current = false;
    isMutedRef.current = false;
  }, []);

  const onTrackUnpublished = useCallback(
    async (publication: LocalTrackPublication) => {
      if (publication.source !== Track.Source.Microphone) {
        return;
      }
      await teardownAnalyser();
      // reset everything just to be sure
      dispatch(updateIsActiveMicrophone(false));
      dispatch(updateIsMicMuted(false));
      dispatch(updateSelectedAudioDevice(''));
    },
    [teardownAnalyser, dispatch],
  );

  const setupAnalyser = useCallback((publication: LocalTrackPublication) => {
    if (publication.source !== Track.Source.Microphone) {
      return;
    }
    // Reset dismissed state for the new track session.
    tooltipDismissedRef.current = false;

    const track = publication.track as LocalAudioTrack;
    const { calculateVolume, cleanup } = createAudioAnalyser(track, {
      cloneTrack: true,
    });
    cleanupAnalyserRef.current = cleanup; // Store the cleanup function for this track.

    intervalRef.current = setInterval(() => {
      const volume = calculateVolume();
      if (isMutedRef.current && volume > 0.2 && !tooltipDismissedRef.current) {
        setShowMutedTooltip(true);
      } else {
        // Ensure we hide the tooltip if conditions are no longer met.
        setShowMutedTooltip(false);
      }
    }, 500);
  }, []);

  const onTrackMuted = useCallback(
    (publication: TrackPublication) => {
      if (publication.source !== Track.Source.Microphone) {
        return;
      }
      dispatch(updateIsMicMuted(true));

      if (muteOnStartRef.current) {
        isMutedRef.current = true;
        // it has been handled, don't do it again for this session.
        muteOnStartRef.current = false;
        return;
      }
      // Don't start immediately for other cases
      muteDelayTimer.current = setTimeout(() => {
        isMutedRef.current = true;
      }, 3000);
    },
    [dispatch],
  );

  const onTrackUnmuted = useCallback(() => {
    // If a timer is pending, cancel it.
    if (muteDelayTimer.current) {
      clearTimeout(muteDelayTimer.current);
    }
    if (isMutedRef.current) {
      dispatch(updateIsMicMuted(false));
    }
    // Immediately disarm the mute check.
    isMutedRef.current = false;
    setShowMutedTooltip(false);
    tooltipDismissedRef.current = false;
  }, [dispatch]);

  // for speaking to send stats & muted tooltip
  useEffect(() => {
    if (!currentRoom) {
      return;
    }

    // Attach all event listeners.
    currentRoom.localParticipant.on(
      ParticipantEvent.IsSpeakingChanged,
      speakingHandler,
    );
    currentRoom.localParticipant.on(
      ParticipantEvent.LocalTrackPublished,
      setupAnalyser,
    );
    currentRoom.localParticipant.on(
      ParticipantEvent.LocalTrackUnpublished,
      onTrackUnpublished,
    );
    currentRoom.localParticipant.on(ParticipantEvent.TrackMuted, onTrackMuted);
    currentRoom.localParticipant.on(
      ParticipantEvent.TrackUnmuted,
      onTrackUnmuted,
    );

    // Main cleanup for when the component unmounts.
    return () => {
      // Detach all listeners.
      currentRoom.localParticipant.off(
        ParticipantEvent.IsSpeakingChanged,
        speakingHandler,
      );
      currentRoom.localParticipant.off(
        ParticipantEvent.LocalTrackPublished,
        setupAnalyser,
      );
      currentRoom.localParticipant.off(
        ParticipantEvent.LocalTrackUnpublished,
        onTrackUnpublished,
      );
      currentRoom.localParticipant.off(
        ParticipantEvent.TrackMuted,
        onTrackMuted,
      );
      currentRoom.localParticipant.off(
        ParticipantEvent.TrackUnmuted,
        onTrackUnmuted,
      );
      // Final, robust cleanup.
      teardownAnalyser().then();
    };
  }, [
    currentRoom,
    speakingHandler,
    setupAnalyser,
    teardownAnalyser,
    onTrackMuted,
    onTrackUnmuted,
    onTrackUnpublished,
  ]);

  const onDismissTooltip = useCallback(() => {
    tooltipDismissedRef.current = true;
    setShowMutedTooltip(false);
  }, []);

  return {
    showMutedTooltip,
    onDismissTooltip,
    muteOnStartRef,
  };
};
