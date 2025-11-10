import React, { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../../store';
import { resetExternalMediaPlayer } from '../../store/slices/externalMediaPlayer';
import ReactPlayerComponent from './reactPlayerComponent';

const ExternalMediaPlayer = () => {
  const playBackUrl = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.externalMediaPlayerFeatures?.url,
  );
  const isActive = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.externalMediaPlayerFeatures?.isActive,
  );

  const isPresenter = useAppSelector(
    (state) => state.session.currentUser?.metadata?.isPresenter,
  );
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (playBackUrl) {
      dispatch(resetExternalMediaPlayer());
    }
  }, [dispatch, playBackUrl]);

  return (
    isActive &&
    playBackUrl && (
      <div className="externalMediaPlayerWrapper m-auto w-full flex items-center justify-center max-w-[1000px] flex-1 p-4">
        <ReactPlayerComponent
          src={playBackUrl ?? ''}
          isPresenter={!!isPresenter}
        />
      </div>
    )
  );
};

export default ExternalMediaPlayer;
