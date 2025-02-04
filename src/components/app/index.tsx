import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  VerifyTokenReqSchema,
  VerifyTokenRes,
  VerifyTokenResSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import ErrorPage, { IErrorPageProps } from '../extra-pages/Error';
import Loading from '../extra-pages/Loading';
import Footer from '../footer';
import Header from '../header';
import MainArea from '../main-area';

import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import { store, useAppDispatch, useAppSelector } from '../../store';
import { addServerVersion, addToken } from '../../store/slices/sessionSlice';
import StartupJoinModal from './joinModal';
import AudioNotification from './audioNotification';
import useKeyboardShortcuts from '../../helpers/hooks/useKeyboardShortcuts';
import useClientCustomization from '../../helpers/hooks/useClientCustomization';
import useWatchWindowSize from '../../helpers/hooks/useWatchWindowSize';
import useWatchVisibilityChange from '../../helpers/hooks/useWatchVisibilityChange';
import WaitingRoomPage from '../waiting-room/room-page';
import { updateIsActiveChatPanel } from '../../store/slices/bottomIconsActivitySlice';
import useThemeSettings from '../../helpers/hooks/useThemeSettings';
import { IConnectLivekit } from '../../helpers/livekit/types';
import { getAccessToken } from '../../helpers/utils';
import { startNatsConn } from '../../helpers/nats';

declare const IS_PRODUCTION: boolean;

const App = () => {
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation();
  // make sure we're using correct body dir
  document.dir = i18n.dir();
  const toastId = useRef<string>(null);

  const [loading, setLoading] = useState<boolean>(true);
  // it could be recorder or RTMP bot
  const [isRecorder, setIsRecorder] = useState<boolean>(false);
  const [userTypeClass, setUserTypeClass] = useState('participant');
  const [currentMediaServerConn, setCurrentMediaServerConn] =
    useState<IConnectLivekit>();
  const waitForApproval = useAppSelector(
    (state) => state.session.currentUser?.metadata?.waitForApproval,
  );

  const [error, setError] = useState<IErrorPageProps | undefined>();
  const [roomConnectionStatus, setRoomConnectionStatus] =
    useState<string>('loading');

  useKeyboardShortcuts(currentMediaServerConn?.room);
  // to handle different customization
  useClientCustomization();
  useWatchVisibilityChange();
  const { deviceClass, orientationClass, screenHeight } = useWatchWindowSize(
    currentMediaServerConn?.room,
  );
  useThemeSettings();

  useEffect(() => {
    const accessToken = getAccessToken();
    let timeout: any;
    if (!accessToken) {
      setLoading(false);
      setError({
        title: t('app.token-missing-title'),
        text: t('app.token-missing-des'),
      });
    } else if (
      window.location.protocol === 'http:' &&
      window.location.hostname !== 'localhost'
    ) {
      setLoading(false);
      setError({
        title: t('app.require-ssl-title'),
        text: t('app.require-ssl-des'),
      });
    } else {
      const verifyToken = async () => {
        let res: VerifyTokenRes;
        try {
          const r = await sendAPIRequest(
            'verifyToken',
            toBinary(
              VerifyTokenReqSchema,
              create(VerifyTokenReqSchema, {
                isProduction: IS_PRODUCTION,
              }),
            ),
            false,
            'application/protobuf',
            'arraybuffer',
          );
          res = fromBinary(VerifyTokenResSchema, new Uint8Array(r));
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
        if (
          res.status &&
          res.natsWsUrls.length &&
          res.roomId &&
          res.userId &&
          res.natsSubjects
        ) {
          // we'll store the token that we received from the URL
          dispatch(addToken(accessToken));
          dispatch(addServerVersion(res.serverVersion ?? ''));

          setRoomConnectionStatus('connecting');
          await startNatsConn(
            res.natsWsUrls,
            accessToken,
            res.roomId,
            res.userId,
            res.natsSubjects,
            setError,
            setRoomConnectionStatus,
            setCurrentMediaServerConn,
          );
        } else {
          setError({
            title: t('app.verification-failed-title'),
            text: t(res.msg),
          });
        }
      };

      if (!currentMediaServerConn) {
        setRoomConnectionStatus('checking');
        timeout = setTimeout(() => {
          verifyToken().then();
        }, 300);
      }
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [t, dispatch, currentMediaServerConn, setError, setRoomConnectionStatus]);

  useEffect(() => {
    if (
      roomConnectionStatus === 'connecting' ||
      roomConnectionStatus === 'checking' ||
      roomConnectionStatus === 'receiving-data'
    ) {
      setLoading(true);
    } else if (roomConnectionStatus === 're-connecting') {
      // @ts-expect-error this won't be an error
      toastId.current = toast.loading(
        t('notifications.room-disconnected-reconnecting'),
        {
          type: 'warning',
          closeButton: false,
          autoClose: false,
        },
      );
    } else {
      setLoading(false);
      if (toastId.current) {
        toast.dismiss(toastId.current);
      }
    }
    //eslint-disable-next-line
  }, [roomConnectionStatus]);

  useEffect(() => {
    if (roomConnectionStatus === 'connected') {
      if (
        currentMediaServerConn?.room.localParticipant.identity ===
          'RECORDER_BOT' ||
        currentMediaServerConn?.room.localParticipant.identity === 'RTMP_BOT'
      ) {
        setIsRecorder(true);
        dispatch(updateIsActiveChatPanel(false));
      }

      if (store.getState().session.currentUser?.metadata?.isAdmin) {
        setUserTypeClass('admin');
      }
    }
    //eslint-disable-next-line
  }, [roomConnectionStatus]);

  const renderMainApp = useCallback(() => {
    if (currentMediaServerConn) {
      return (
        <div className="plugNmeet-app overflow-hidden h-screen">
          {!isRecorder ? <Header /> : null}
          <MainArea />
          <Footer />
          <AudioNotification />
        </div>
      );
    }
    return null;
  }, [isRecorder, currentMediaServerConn]);

  const onCloseStartupModal = async () => {
    if (currentMediaServerConn) {
      await currentMediaServerConn.connect();
    }
  };

  const renderElms = useMemo(() => {
    if (loading) {
      return <Loading text={t(('app.' + roomConnectionStatus) as any)} />;
    } else if (error && !loading) {
      return <ErrorPage title={error.title} text={error.text} />;
    } else if (
      roomConnectionStatus === 'connected' ||
      roomConnectionStatus === 're-connecting'
    ) {
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
