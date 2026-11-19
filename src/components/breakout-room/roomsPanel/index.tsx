import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { JoinBreakoutRoomReqSchema } from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';
import clsx from 'clsx';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { setActiveSidePanel } from '../../../store/slices/bottomIconsActivitySlice';
import {
  useGetBreakoutRoomsQuery,
  useJoinRoomMutation,
} from '../../../store/services/breakoutRoomApi';
import { getMediaServerConnRoom } from '../../../helpers/livekit/utils';
import {
  buildAccessTokenUrl,
  isAgenticSessionsMode,
  parseParentRoomId,
} from '../utils/breakoutRoom';
import { CloseIconSVG } from '../../../assets/Icons/CloseIconSVG';
import { LoadingIcon } from '../../../assets/Icons/Loading';
import { getNatsConn } from '../../../helpers/nats';
import { AiIconSVG } from '../../../assets/Icons/AiIconSVG';

const RoomsPanel = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const isAdmin = useAppSelector((state) => !!state.session.currentUser?.metadata?.isAdmin);
  const currentUserId = useAppSelector((state) => state.session.currentUser?.userId);
  const metadata = useAppSelector((state) => state.session.currentRoom?.metadata);
  const allowSelfSelect = useAppSelector(
    (state) =>
      !!state.session.currentRoom?.metadata?.roomFeatures?.breakoutRoomFeatures?.allowSelfSelect,
  );

  const { data, isLoading, isError, error } = useGetBreakoutRoomsQuery(undefined, {
    pollingInterval: 10000,
  });

  const [joinRoom, joinResult] = useJoinRoomMutation();

  const currentRoom = useMemo(() => {
    return store.getState().session.currentRoom;
  }, []);

  const rooms = useMemo(() => {
    const base = data?.rooms ?? [];
    const sorted = base.slice();
    sorted.sort((a, b) => a.title.localeCompare(b.title));
    return sorted;
  }, [data]);

  const agenticMode = isAgenticSessionsMode(metadata, rooms);

  useEffect(() => {
    if (joinResult.isSuccess && joinResult.data?.status && joinResult.data.token) {
      // ensure we've diconnected from current room
      const conn = getNatsConn();
      const toUrl = buildAccessTokenUrl(joinResult.data.token);
      conn.leaveRoom('notifications.switching-room').then(() => {
        // Switch to the selected breakout room in the current tab.
        window.location.replace(toUrl);
      });
      return;
    } else if ((joinResult.isSuccess && !joinResult.data?.status) || joinResult.isError) {
      const msg = joinResult.data?.msg ?? (joinResult.error as any)?.data?.msg ?? 'Error';
      toast(t(msg), { type: 'error' });
    }
  }, [joinResult.isSuccess, joinResult.isError, joinResult.data, joinResult.error, t]);

  const handleJoin = (roomId: string) => {
    const conn = getMediaServerConnRoom();
    joinRoom(
      create(JoinBreakoutRoomReqSchema, {
        breakoutRoomId: roomId,
        userId: conn.localParticipant.identity,
      }),
    );
  };

  const isCurrentRoom = (roomId: string) => {
    // metadata carries the parent reference as `<roomId>:<tableId>`; compare
    // using the plain parent room id only.
    const parentRoomId = parseParentRoomId(currentRoom.metadata?.parentRoomId);
    return !!parentRoomId && `${parentRoomId}-${roomId}` === currentRoom.roomId;
  };

  return (
    <div className="side-panel-bg-color relative z-10 w-full bg-Gray-25 dark:bg-dark-primary border-s border-Gray-200 dark:border-Gray-800 h-full">
      <button
        type="button"
        aria-label={t('close').toString()}
        className="inline-block absolute z-50 end-3 3xl:end-5 top-[10px] 3xl:top-[18px] text-Gray-600 dark:text-white cursor-pointer focus-ring"
        onClick={() => dispatch(setActiveSidePanel(null))}
      >
        <CloseIconSVG />
      </button>
      <div className="inner-wrapper relative z-20 w-full">
        <div className="top flex items-center h-10 3xl:h-14 px-3 3xl:px-5 border-b border-Gray-200 dark:border-Gray-800">
          <p className="flex items-center text-sm 3xl:text-base text-Gray-950 dark:text-white font-medium leading-tight">
            {agenticMode && <AiIconSVG classes="w-4 h-4 shrink-0 text-Blue me-1.5" />}
            {agenticMode
              ? t('breakout-room.ai-sessions-panel-title')
              : t('breakout-room.rooms-panel-title')}
          </p>
        </div>
        <div className="breakout-rooms-panel-wrapper min-h-[90px] relative p-3 3xl:p-5">
          {isLoading && !data && (
            <div className="absolute text-center top-1/2 -translate-y-1/2 z-999 start-0 end-0 m-auto pointer-events-none">
              <LoadingIcon
                className={'inline w-10 h-10 me-3 text-Gray-200 animate-spin'}
                fillColor={'#004D90'}
              />
            </div>
          )}
          {isError && (
            <p className="text-sm text-red-500">
              {t((error as any)?.data?.msg ?? 'breakout-room.error-loading').toString()}
            </p>
          )}
          {!isLoading && !isError && rooms.length === 0 && (
            <p className="text-sm text-Gray-600 dark:text-Gray-300">
              {agenticMode
                ? t('breakout-room.no-ai-sessions')
                : t(
                    !isAdmin && !allowSelfSelect
                      ? 'breakout-room.not-assigned'
                      : 'breakout-room.no-rooms',
                  )}
            </p>
          )}
          {rooms.map((room) => {
            // proto3 JSON omits empty repeated fields — guard rooms with no users key.
            const roomUsers = room.users ?? [];
            const joinedCount = roomUsers.filter((u) => u.joined).length;
            const current = isCurrentRoom(room.id);
            // AI Agent rooms are 1-on-1: a single assigned user is the learner.
            const learner = roomUsers[0];
            const learnerJoined = !!learner?.joined;
            const agentOnline = !!room.aiAgentJoined;
            const aiContext = room.enableAiAgent ? (room.aiAgentContext ?? '').trim() : '';
            // the admin can own one of the 1-on-1 AI session rooms too
            const assignedToMe =
              !!currentUserId &&
              !!room.enableAiAgent &&
              roomUsers.some((u) => u.id === currentUserId);
            return (
              <div
                key={room.id}
                className={clsx(
                  'flex items-center justify-between gap-3 py-2 border-b border-Gray-200 dark:border-Gray-800',
                  assignedToMe &&
                    '-mx-2 px-2 rounded-lg bg-Blue/5 dark:bg-Blue/10 ring-1 ring-inset ring-Blue/40',
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm 3xl:text-base text-Gray-950 dark:text-white font-medium truncate">
                      {room.title}
                    </p>
                    {assignedToMe && (
                      <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-Blue/10 text-Blue dark:bg-Blue/20 dark:text-Blue2-50 border border-Blue/20">
                        {t('breakout-room.assigned-to-you')}
                      </span>
                    )}
                  </div>
                  {room.enableAiAgent ? (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs opacity-80 dark:opacity-90">
                      <span
                        className="inline-flex items-center gap-1.5 min-w-0"
                        title={
                          learnerJoined
                            ? t('breakout-room.user-joined')
                            : t('breakout-room.not-joined')
                        }
                      >
                        <span
                          className={clsx(
                            'w-2 h-2 rounded-full shrink-0',
                            learnerJoined ? 'bg-Green-700' : 'bg-Red-600',
                          )}
                        />
                        <span className="truncate">
                          {learner?.name || t('breakout-room.unassigned')}
                        </span>
                      </span>
                      <span aria-hidden="true" className="opacity-50">
                        ·
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 shrink-0"
                        title={
                          agentOnline
                            ? t('breakout-room.agent-online')
                            : t('breakout-room.agent-offline')
                        }
                      >
                        <span
                          className={clsx(
                            'w-2 h-2 rounded-full shrink-0',
                            agentOnline ? 'bg-Green-700' : 'bg-Red-600',
                          )}
                        />
                        <span>{t('breakout-room.ai-session-badge')}</span>
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs opacity-70 dark:opacity-80 dark:text-white truncate">
                      {t('breakout-room.joined-count', { count: joinedCount })}
                    </p>
                  )}
                  {aiContext && (
                    <p
                      className="text-[11px] text-Gray-600 dark:text-Gray-300 truncate"
                      title={aiContext}
                    >
                      {aiContext}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {current && (
                    <span className="text-xs font-medium px-2 py-1 rounded-[10px] bg-primary-color text-white">
                      {t('breakout-room.current-room')}
                    </span>
                  )}
                  <button
                    className="primary-button h-7 px-5 cursor-pointer text-sm font-medium bg-Blue hover:bg-white border border-Blue2-600 rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => handleJoin(room.id)}
                    disabled={current || joinResult.isLoading}
                  >
                    {t('breakout-room.join')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RoomsPanel;
