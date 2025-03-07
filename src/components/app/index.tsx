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
import AudioNotification from './audioNotification';
import useKeyboardShortcuts from '../../helpers/hooks/useKeyboardShortcuts';
import useClientCustomization from '../../helpers/hooks/useClientCustomization';
import useWatchWindowSize from '../../helpers/hooks/useWatchWindowSize';
import useWatchVisibilityChange from '../../helpers/hooks/useWatchVisibilityChange';
import WaitingRoomPage from '../waiting-room/room-page';
import { updateIsActiveChatPanel } from '../../store/slices/bottomIconsActivitySlice';
import useThemeSettings from '../../helpers/hooks/useThemeSettings';
import { IConnectLivekit } from '../../helpers/livekit/types';
import { getAccessToken, isUserRecorder } from '../../helpers/utils';
import { startNatsConn } from '../../helpers/nats';
import Landing from '../landing';
import useBodyPix from '../virtual-background/hooks/useBodyPix';
import { InfoToOpenConn, roomConnectionStatus } from './helper';
import InsertE2EEKey from '../extra-pages/InsertE2EEKey';

declare const IS_PRODUCTION: boolean;

const App = () => {
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation();
  // make sure we're using correct body dir
  document.dir = i18n.dir();
  const toastId = useRef<string>(null);
  // we'll require making ready virtual background
  // elements as early as possible.
  useBodyPix();

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
    useState<roomConnectionStatus>('loading');
  const [openConnInfo, setOpenConnInfo] = useState<InfoToOpenConn | undefined>(
    undefined,
  );
  const [openConn, setOpenConn] = useState<boolean>(false);

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
          setOpenConnInfo({
            accessToken: accessToken,
            natsWsUrls: res.natsWsUrls,
            natsSubjects: res.natsSubjects,
            roomId: res.roomId,
            userId: res.userId,
            serverVersion: res.serverVersion ?? '',
          });

          if (res.enabledSelfInsertEncryptionKey) {
            setRoomConnectionStatus('insert-e2ee-key');
          } else {
            setOpenConn(true);
          }
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
      const session = store.getState().session;
      if (session.currentUser && isUserRecorder(session.currentUser.userId)) {
        setIsRecorder(true);
        dispatch(updateIsActiveChatPanel(false));
      }

      if (session.currentUser?.metadata?.isAdmin) {
        setUserTypeClass('admin');
      }
    }
    //eslint-disable-next-line
  }, [roomConnectionStatus]);

  useEffect(() => {
    if (openConnInfo && openConn) {
      // we'll store the token that we received from the URL
      dispatch(addToken(openConnInfo.accessToken));
      dispatch(addServerVersion(openConnInfo.serverVersion));

      setRoomConnectionStatus('connecting');
      startNatsConn(
        openConnInfo.natsWsUrls,
        openConnInfo.accessToken,
        openConnInfo.roomId,
        openConnInfo.userId,
        openConnInfo.natsSubjects,
        setError,
        setRoomConnectionStatus,
        setCurrentMediaServerConn,
      ).then();
    }
  }, [dispatch, openConnInfo, openConn]);

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
    } else if (roomConnectionStatus === 'insert-e2ee-key') {
      return <InsertE2EEKey setOpenConn={setOpenConn} />;
    } else if (roomConnectionStatus === 'ready') {
      return <Landing onCloseModal={onCloseStartupModal} />;
    } else {
      return null;
    }
    //eslint-disable-next-line
  }, [loading, error, roomConnectionStatus, waitForApproval, renderMainApp]);

  return (
    <div
      className={`${orientationClass} ${deviceClass} ${userTypeClass} bg-Gray-50`}
      style={{ height: screenHeight }}
    >
      {renderElms}
    </div>
  );
};

export default App;
