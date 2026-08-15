import React, { ReactElement, useEffect, useMemo, useState } from 'react';
import {
  LocalTrackPublication,
  RemoteAudioTrack,
  RemoteTrackPublication,
  Track,
} from 'livekit-client';
import { useTranslation } from 'react-i18next';

import VideoElm from './videoElm';
import AudioElm from './audioElm';
import { CurrentConnectionEvents } from '../../../helpers/livekit/types';
import { getMediaServerConn } from '../../../helpers/livekit/utils';
import { store, useAppSelector } from '../../../store';

const ScreenShareElements = () => {
  const { t } = useTranslation();
  const isActiveScreenSharingView = useAppSelector(
    (state) => state.roomSettings.activeScreenSharingView,
  );
  const [screenShareTracks, setScreenShareTracks] =
    useState<
      Map<string, Array<LocalTrackPublication | RemoteTrackPublication>>
    >();
  const currentConnection = getMediaServerConn();

  useEffect(() => {
    if (currentConnection.screenShareTracksMap.size) {
      setScreenShareTracks(currentConnection.screenShareTracksMap);
    }
    currentConnection.on(
      CurrentConnectionEvents.ScreenShareTracks,
      setScreenShareTracks,
    );
    return () => {
      currentConnection.off(
        CurrentConnectionEvents.ScreenShareTracks,
        setScreenShareTracks,
      );
    };
  }, [currentConnection]);

  useEffect(() => {
    screenShareTracks?.forEach((tracks) => {
      tracks.forEach((track) => {
        if (track instanceof RemoteTrackPublication) {
          track.setEnabled(isActiveScreenSharingView);
        }
      });
    });
  }, [screenShareTracks, isActiveScreenSharingView]);

  return useMemo(() => {
    if (screenShareTracks) {
      const elm = Array<ReactElement>();

      screenShareTracks.forEach((tracks, userId) => {
        tracks.forEach((track) => {
          if (track.source === Track.Source.ScreenShare) {
            if (
              track instanceof RemoteTrackPublication &&
              !isActiveScreenSharingView
            ) {
              const participants = store.getState().participants.entities;
              const name = participants[userId]?.name ?? userId;
              elm.push(
                <div
                  key={track.trackSid}
                  className="w-full h-full flex items-center justify-center p-4"
                >
                  <div className="w-full max-w-xl aspect-video bg-gray-900 overflow-hidden rounded-md flex items-center justify-center">
                    <p className="text-sm 3xl:text-base text-white text-center px-4">
                      {t('notifications.screen-share-view-disabled', { name })}
                    </p>
                  </div>
                </div>,
              );
            } else {
              elm.push(<VideoElm key={track.trackSid} track={track} />);
            }
          } else if (
            track.source === Track.Source.ScreenShareAudio &&
            track.audioTrack &&
            track.audioTrack instanceof RemoteAudioTrack
          ) {
            // we won't add local screen share audio track to avoid eco
            elm.push(
              <AudioElm key={track.trackSid} audioTrack={track.audioTrack} />,
            );
          }
        });
      });

      return elm;
    } else {
      return null;
    }
  }, [screenShareTracks, isActiveScreenSharingView, t]);
};

export default ScreenShareElements;
