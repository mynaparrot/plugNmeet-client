import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import ErrorPage from '../extra-pages/Error';
import Loading from '../extra-pages/Loading';
import Footer from '../footer';
import Header from '../header';
import MainArea from '../main-area';

import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import { store, useAppDispatch } from '../../store';
import { addToken } from '../../store/slices/sessionSlice';
import StartupJoinModal from './joinModal';
import useLivekitConnect from '../../helpers/livekit/hooks/useLivekitConnect';
import AudioNotification from './audioNotification';
import useBodyPix from '../virtual-background/hooks/useBodyPix';
import useTFLite from '../virtual-background/hooks/useTFLite';
import { defaultSegmentationConfig } from '../virtual-background/helpers/segmentationHelper';
import useKeyboardShortcuts from '../../helpers/hooks/useKeyboardShortcuts';
import useDesignCustomization from '../../helpers/hooks/useDesignCustomization';
import useWatchWindowSize from '../../helpers/hooks/useWatchWindowSize';
import useWatchVisibilityChange from '../../helpers/hooks/useWatchVisibilityChange';

const App = () => {
  const dispatch = useAppDispatch();
  const rootRef = useRef(null);
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  // it could be recorder or RTMP bot
  const [isRecorder, setIsRecorder] = useState<boolean>(false);
  const [userTypeClass, setUserTypeClass] = useState('participant');

  // we'll require making ready virtual background
  // elements as early as possible.
  useBodyPix();
  useTFLite(defaultSegmentationConfig);

  // some custom hooks
  const {
    error,
    setError,
    roomConnectionStatus,
    setRoomConnectionStatus,
    currentRoom,
    audioSubscribers,
    videoSubscribers,
    screenShareTracks,
    startLivekitConnection,
  } = useLivekitConnect();

  useKeyboardShortcuts(currentRoom);
  useDesignCustomization();
  useWatchVisibilityChange();
  const { deviceClass, orientationClass, screenHeight } = useWatchWindowSize(
    currentRoom,
    rootRef,
  );

  useEffect(() => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    if (typeof params.access_token === 'undefined') {
      setLoading(false);
      setError({
        title: t('app.token-missing-title'),
        text: t('app.token-missing-des'),
      });
    } else {
      const verifyToken = async () => {
        let res: any;
        try {
          res = await sendAPIRequest('verifyToken', {});
        } catch (error: any) {
          setRoomConnectionStatus('ready');
          setLoading(false);
          setError({
            title: t('app.verification-failed-title'),
            text: t('app.token-not-valid'),
          });
          return;
        }

        setRoomConnectionStatus('ready');
        setLoading(false);
        if (res.status) {
          dispatch(addToken(params.access_token));
        } else {
          setError({
            title: t('app.verification-failed-title'),
            text: t(res.msg),
          });
        }
      };

      if (!currentRoom) {
        setRoomConnectionStatus('checking');
        verifyToken();
      }
    }
  }, [t, dispatch, currentRoom, setError, setRoomConnectionStatus]);

  useEffect(() => {
    if (
      roomConnectionStatus === 'connecting' ||
      roomConnectionStatus === 're-connecting' ||
      roomConnectionStatus === 'checking'
    ) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [roomConnectionStatus]);

  useEffect(() => {
    if (currentRoom) {
      if (
        currentRoom.localParticipant.identity === 'RECORDER_BOT' ||
        currentRoom.localParticipant.identity === 'RTMP_BOT'
      ) {
        setIsRecorder(true);
      }

      if (store.getState().session.currentUser?.metadata?.is_admin) {
        setUserTypeClass('admin');
      }
    }
  }, [currentRoom]);

  const renderMainApp = () => {
    if (currentRoom) {
      return (
        <div className="plugNmeet-app overflow-hidden" ref={rootRef}>
          {!isRecorder ? <Header currentRoom={currentRoom} /> : null}
          <MainArea
            currentRoom={currentRoom}
            audioSubscribers={audioSubscribers}
            videoSubscribers={videoSubscribers}
            screenShareTracks={screenShareTracks}
            isRecorder={isRecorder}
          />
          <Footer currentRoom={currentRoom} isRecorder={isRecorder} />
          <AudioNotification />
        </div>
      );
    }

    return null;
  };

  const onCloseStartupModal = () => {
    startLivekitConnection();
  };

  const render = () => {
    if (loading) {
      return <Loading text={t('app.' + roomConnectionStatus)} />;
    } else if (error && !loading) {
      return <ErrorPage title={error.title} text={error.text} />;
    } else if (currentRoom?.state === 'connected') {
      return renderMainApp();
    } else if (roomConnectionStatus === 'ready') {
      return <StartupJoinModal onCloseModal={onCloseStartupModal} />;
    } else {
      return null;
    }
  };

  return (
    <div
      className={`${orientationClass} ${deviceClass} ${userTypeClass}`}
      style={{ height: screenHeight }}
    >
      {render()}
    </div>
  );
};

export default App;
