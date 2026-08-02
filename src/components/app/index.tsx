import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ErrorPage, { IErrorPageProps } from '../extra-pages/Error';
import Loading from '../extra-pages/Loading';
import Footer from '../footer';
import Header from '../header';
import MainArea from '../main-area';
import Landing from '../landing';
import InsertE2EEKey from '../extra-pages/InsertE2EEKey';
import DummyAudio from './dummyAudio';

import { store, useAppDispatch } from '../../store';
import { addServerVersion, addToken } from '../../store/slices/sessionSlice';
import AudioNotification from './audioNotification';
import ReactionsOverlay from '../reactions';
import useKeyboardShortcuts from '../../helpers/hooks/useKeyboardShortcuts';
import useClientCustomization from '../../helpers/hooks/useClientCustomization';
import useWatchWindowSize from '../../helpers/hooks/useWatchWindowSize';
import useWatchVisibilityChange from '../../helpers/hooks/useWatchVisibilityChange';
import useThemeSettings from '../../helpers/hooks/useThemeSettings';
import { IConnectLivekit } from '../../helpers/livekit/types';
import { isUserRecorder } from '../../helpers/utils';
import { startNatsConn } from '../../helpers/nats';
import { InfoToOpenConn, roomConnectionStatus, verifyToken } from './helper';
import { setActiveSidePanel } from '../../store/slices/bottomIconsActivitySlice';

const App = () => {
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState<boolean>(true);
  // it could be recorder or RTMP bot
  const [userTypeClass, setUserTypeClass] = useState('participant');
  const [currentMediaServerConn, setCurrentMediaServerConn] =
    useState<IConnectLivekit>();

  const [error, setError] = useState<IErrorPageProps | undefined>();
  const [roomConnectionStatus, setRoomConnectionStatus] =
    useState<roomConnectionStatus>('loading');
  const [openConnInfo, setOpenConnInfo] = useState<InfoToOpenConn | undefined>(
    undefined,
  );
  const [openConn, setOpenConn] = useState<boolean>(false);
  const [isAppReady, setIsAppReady] = useState<boolean>(false);

  useKeyboardShortcuts(currentMediaServerConn?.room);
  // to handle different customization
  useClientCustomization();
  useWatchVisibilityChange();
  const { deviceClass, orientationClass } = useWatchWindowSize(
    currentMediaServerConn?.room,
  );
  useThemeSettings();

  useEffect(() => {
    // make sure we're using correct body dir
    document.dir = i18n.dir();
  }, [i18n, i18n.language]);

  useEffect(() => {
    void verifyToken(
      setLoading,
      setError,
      setOpenConnInfo,
      setRoomConnectionStatus,
      setOpenConn,
    );
  }, []);

  useEffect(() => {
    if (openConnInfo && openConn) {
      // we'll store the token that we received from the URL
      dispatch(addToken(openConnInfo.accessToken));
      dispatch(addServerVersion(openConnInfo.serverVersion));

      setRoomConnectionStatus('connecting');
      void startNatsConn(
        openConnInfo.natsWsUrls,
        openConnInfo.accessToken,
        openConnInfo.roomId,
        openConnInfo.userId,
        openConnInfo.roomStreamName,
        openConnInfo.natsSubjects,
        setError,
        setRoomConnectionStatus,
        setCurrentMediaServerConn,
      );
    }
  }, [dispatch, openConnInfo, openConn]);

  useEffect(() => {
    switch (roomConnectionStatus) {
      case 'connecting':
      case 'checking':
      case 'receiving-data':
        setLoading(true);
        break;
      case 'error':
        setLoading(false);
        break;
      case 'ready': {
        setLoading(false);
        const session = store.getState().session;
        if (session.currentUser && isUserRecorder(session.currentUser.userId)) {
          dispatch(setActiveSidePanel(null));
        }
        if (session.currentUser?.metadata?.isAdmin) {
          setUserTypeClass('admin');
        }
        break;
      }
    }
  }, [dispatch, roomConnectionStatus]);

  const renderElms = () => {
    if (loading) {
      return <Loading text={t(`app.${roomConnectionStatus}`)} />;
    }

    if (error) {
      return <ErrorPage title={error.title} text={error.text} />;
    }

    if (roomConnectionStatus === 'insert-e2ee-key') {
      return <InsertE2EEKey setOpenConn={setOpenConn} />;
    }

    if (!isAppReady) {
      return (
        <Landing
          setIsAppReady={setIsAppReady}
          roomConnectionStatus={roomConnectionStatus}
        />
      );
    }

    return (
      <div className="plugNmeet-app overflow-hidden h-full flex flex-col">
        <Header />
        <MainArea />
        <Footer />
        <AudioNotification />
        <DummyAudio />
        <ReactionsOverlay />
      </div>
    );
  };

  return (
    <div
      className={`${orientationClass} ${deviceClass} ${userTypeClass} h-dvh bg-Gray-50 dark:bg-dark-secondary`}
    >
      {renderElms()}
    </div>
  );
};

export default App;
