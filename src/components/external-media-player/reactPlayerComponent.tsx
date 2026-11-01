import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import ReactPlayer from 'react-player';
import { debounce } from 'es-toolkit';
import { DataMsgBodyType } from 'plugnmeet-protocol-js';

import { useAppSelector } from '../../store';
import { getNatsConn } from '../../helpers/nats';
import {
  IExternalMediaPlayerEvent,
  playerActionEvent,
} from '../../store/slices/externalMediaPlayer';

interface IReactPlayerComponentProps {
  src: string;
  isPresenter: boolean;
}

const SEEK_DEBOUNCE_MS = 400;
const SEEK_SAFETY_MS = 1000;
const SYNC_INTERVAL_MS = 4000;
const SYNC_DRIFT_MAX = 2;
const SEEK_DRIFT_MAX = 0.5;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const ReactPlayerComponent = ({ src, isPresenter }: IReactPlayerComponentProps) => {
  const player = useRef<HTMLVideoElement | null>(null);
  const isSeeking = useRef(false);
  const seekSafetyTimer = useRef<number | undefined>(undefined);

  const playerEvent = useAppSelector((state) => state.externalMediaPlayer);
  const height = useAppSelector((state) => state.bottomIconsActivity.screenHeight);
  const width = useAppSelector((state) => state.bottomIconsActivity.screenWidth);

  const broadcast = useCallback(
    async (action: Exclude<playerActionEvent, ''>) => {
      const elm = player.current;
      if (!elm || !isPresenter) {
        return;
      }

      const msg: IExternalMediaPlayerEvent = {
        action,
        isPlaying:
          action === 'play' ? true : action === 'pause' ? false : !elm.paused && !elm.ended,
        updatedAt: Date.now(),
      };

      if (isFiniteNumber(elm.currentTime) && elm.currentTime >= 0) {
        msg.seekTo = elm.currentTime;
      }
      if (isFiniteNumber(elm.playbackRate) && elm.playbackRate > 0) {
        msg.playbackRate = elm.playbackRate;
      }

      try {
        await getNatsConn().sendDataMessage(
          DataMsgBodyType.EXTERNAL_MEDIA_PLAYER_EVENTS,
          JSON.stringify(msg),
        );
      } catch {
        // playing locally still works even if the sync message cannot be sent
      }
    },
    [isPresenter],
  );

  const onSeeking = useCallback(() => {
    isSeeking.current = true;
    window.clearTimeout(seekSafetyTimer.current);
    seekSafetyTimer.current = window.setTimeout(() => {
      isSeeking.current = false;
    }, SEEK_SAFETY_MS);
  }, []);

  const onSeeked = useMemo(
    () =>
      debounce(() => {
        window.clearTimeout(seekSafetyTimer.current);
        isSeeking.current = false;
        void broadcast('seeked');
      }, SEEK_DEBOUNCE_MS),
    [broadcast],
  );

  const onPlay = useCallback(() => {
    if (isSeeking.current) {
      return;
    }
    void broadcast('play');
  }, [broadcast]);

  const onPause = useCallback(() => {
    if (isSeeking.current) {
      return;
    }
    void broadcast('pause');
  }, [broadcast]);

  const onEnded = useCallback(() => {
    void broadcast('pause');
  }, [broadcast]);

  const onRateChange = useCallback(() => {
    if (isSeeking.current) {
      return;
    }
    void broadcast('sync');
  }, [broadcast]);

  useEffect(() => {
    return () => {
      onSeeked.cancel();
      window.clearTimeout(seekSafetyTimer.current);
    };
  }, [onSeeked]);

  // Presenter heartbeat: keeps late joiners and remounted players in sync.
  useEffect(() => {
    if (!isPresenter) {
      return;
    }
    const timer = window.setInterval(() => {
      if (!player.current || isSeeking.current) {
        return;
      }
      void broadcast('sync');
    }, SYNC_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [broadcast, isPresenter]);

  const syncPlayerState = useCallback(() => {
    const elm = player.current;
    if (!elm || isPresenter || playerEvent.action === '') {
      return;
    }

    const { action, playbackRate, seekTo, isPlaying: eventIsPlaying } = playerEvent;

    if (isFiniteNumber(playbackRate) && playbackRate > 0 && elm.playbackRate !== playbackRate) {
      elm.playbackRate = playbackRate;
    }

    if (isFiniteNumber(seekTo) && seekTo >= 0) {
      const drift = Math.abs(elm.currentTime - seekTo);
      if (drift > (action === 'sync' ? SYNC_DRIFT_MAX : SEEK_DRIFT_MAX)) {
        elm.currentTime = seekTo;
      }
    }

    const shouldPlay =
      typeof eventIsPlaying === 'boolean'
        ? eventIsPlaying
        : action === 'play'
          ? true
          : action === 'pause'
            ? false
            : undefined;

    if (shouldPlay === true && elm.paused) {
      elm.play().catch(() => {});
    } else if (shouldPlay === false && !elm.paused) {
      elm.pause();
    }
  }, [isPresenter, playerEvent]);

  // Runs right after the ref callback attaches the element, then again on the media
  // events below once metadata is available, so a stored action is applied on join.
  useEffect(() => {
    syncPlayerState();
  }, [syncPlayerState]);

  const ref = useCallback((_player: HTMLVideoElement) => {
    player.current = _player;
  }, []);

  return (
    <ReactPlayer
      ref={ref}
      src={src}
      width={width * 0.7}
      height={height * 0.7}
      controls={isPresenter}
      onPlay={onPlay}
      onPause={onPause}
      onEnded={onEnded}
      onSeeking={onSeeking}
      onSeeked={onSeeked}
      onRateChange={onRateChange}
      onLoadedMetadata={syncPlayerState}
      onCanPlay={syncPlayerState}
      autoPlay={false}
    />
  );
};

export default ReactPlayerComponent;
