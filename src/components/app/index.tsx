import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createSelector } from '@reduxjs/toolkit';

import ErrorPage from '../extra-pages/Error';
import Loading from '../extra-pages/Loading';
import Footer from '../footer';
import Header from '../header';
import MainArea from '../main-area';

import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import { RootState, store, useAppDispatch, useAppSelector } from '../../store';
import { addToken } from '../../store/slices/sessionSlice';
import StartupJoinModal from './joinModal';
import useLivekitConnect, {
  LivekitInfo,
} from '../../helpers/livekit/hooks/useLivekitConnect';
import AudioNotification from './audioNotification';
import useBodyPix from '../virtual-background/hooks/useBodyPix';
import useKeyboardShortcuts from '../../helpers/hooks/useKeyboardShortcuts';
import useDesignCustomization from '../../helpers/hooks/useDesignCustomization';
import useWatchWindowSize from '../../helpers/hooks/useWatchWindowSize';
import useWatchVisibilityChange from '../../helpers/hooks/useWatchVisibilityChange';
import WaitingRoomPage from '../waiting-room/waitingRoomPage';
import { updateIsActiveChatPanel } from '../../store/slices/bottomIconsActivitySlice';
import useThemeSettings from '../../helpers/hooks/useThemeSettings';
import {
  VerifyTokenReq,
  VerifyTokenRes,
} from '../../helpers/proto/plugnmeet_common_api_pb';
import { IConnectLivekit } from '../../helpers/livekit/types';

declare const IS_PRODUCTION: boolean;
const waitingForApprovalSelector = createSelector(
  (state: RootState) => state.session.currentUser?.metadata?.wait_for_approval,
  (wait_for_approval) => wait_for_approval,
);

const App = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  // it could be recorder or RTMP bot
  const [isRecorder, setIsRecorder] = useState<boolean>(false);
  const [userTypeClass, setUserTypeClass] = useState('participant');
  const [livekitInfo, setLivekitInfo] = useState<LivekitInfo>();
  const [currentConnection, setCurrentConnection] = useState<IConnectLivekit>();
  const waitForApproval = useAppSelector(waitingForApprovalSelector);

  // we'll require making ready virtual background
  // elements as early as possible.
  useBodyPix();

  // some custom hooks
  const {
    error,
    setError,
    roomConnectionStatus,
    setRoomConnectionStatus,
    currentRoom,
    startLivekitConnection,
  } = useLivekitConnect();

  useKeyboardShortcuts(currentRoom);
  useDesignCustomization();
  useWatchVisibilityChange();
  const { deviceClass, orientationClass, screenHeight } =
    useWatchWindowSize(currentRoom);
  useThemeSettings();

  useEffect(() => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    let timeout;
    if (typeof params.access_token === 'undefined') {
      setLoading(false);
      setError({
        title: t('app.token-missing-title'),
        text: t('app.token-missing-des'),
      });
    } else {
      const verifyToken = async () => {
        let res: VerifyTokenRes;
        try {
          const r = await sendAPIRequest(
            'verifyToken',
            new VerifyTokenReq({
              isProduction: IS_PRODUCTION,
            }).toBinary(),
            false,
            'application/protobuf',
            'arraybuffer',
          );
          res = VerifyTokenRes.fromBinary(new Uint8Array(r));
        } catch (error: any) {
          console.error(error);

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
        if (res.status && res.livekitHost && res.token) {
          // we'll store token that we received from URL
          dispatch(addToken(params.access_token));

          // for livekit need to use generated token & host
          setLivekitInfo({
            livekit_host: res.livekitHost,
            token: res.token,
          });
        } else {
          setError({
            title: t('app.verification-failed-title'),
            text: t(res.msg),
          });
        }
      };

      if (!currentRoom) {
        setRoomConnectionStatus('checking');
        timeout = setTimeout(() => {
          verifyToken();
        }, 300);
      }
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
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
        dispatch(updateIsActiveChatPanel(false));
      }

      if (store.getState().session.currentUser?.metadata?.is_admin) {
        setUserTypeClass('admin');
      }
    }
  }, [currentRoom, dispatch]);

  const renderMainApp = useCallback(() => {
    if (currentRoom && currentConnection) {
      return (
        <div className="plugNmeet-app overflow-hidden">
          {!isRecorder ? <Header currentRoom={currentRoom} /> : null}
          <MainArea
            currentRoom={currentRoom}
            isRecorder={isRecorder}
            currentConnection={currentConnection}
          />
          <Footer currentRoom={currentRoom} isRecorder={isRecorder} />
          <AudioNotification />
        </div>
      );
    }
    return null;
  }, [isRecorder, currentRoom, currentConnection]);

  const onCloseStartupModal = () => {
    if (livekitInfo) {
      const currentConnection = startLivekitConnection(livekitInfo);
      setCurrentConnection(currentConnection);
    }
  };

  const renderElms = useMemo(() => {
    if (loading) {
      return <Loading text={t('app.' + roomConnectionStatus)} />;
    } else if (error && !loading) {
      return <ErrorPage title={error.title} text={error.text} />;
    } else if (currentRoom?.state === 'connected') {
      if (waitForApproval) {
        return <WaitingRoomPage />;
      }
      return renderMainApp();
    } else if (roomConnectionStatus === 'ready') {
      return <StartupJoinModal onCloseModal={onCloseStartupModal} />;
    } else {
      return null;
    }
    //eslint-disable-next-line
  }, [loading, error, roomConnectionStatus, waitForApproval, renderMainApp]);

  return (
    <div
      className={`${orientationClass} ${deviceClass} ${userTypeClass} dark:bg-darkPrimary/70`}
      style={{ height: screenHeight }}
    >
      {renderElms}
    </div>
  );
};

export default App;
