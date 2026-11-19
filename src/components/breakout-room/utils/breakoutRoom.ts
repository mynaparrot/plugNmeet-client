import { create } from '@bufbuild/protobuf';
import { BackToMainRoomReqSchema } from 'plugnmeet-protocol-js';

import { store } from '../../../store';
import { breakoutRoomApi } from '../../../store/services/breakoutRoomApi';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';
import { setReturningToMainRoom } from '../../../store/slices/breakoutRoomSlice';
import { IRoomMetadata } from '../../../store/slices/interfaces/session';
import i18n from '../../../helpers/i18n';
import { isAutoPerUserAISessionRoom } from '../../../helpers/aiAgentSession';
import { setSkipLandingOnce } from '../../landing/skipLandingOnce';

/**
 * Build the app URL for a fresh access token, reusing the current page's path
 * and query params. plugNmeet boots entirely from `?access_token=...`, so
 * redirecting the current tab to this URL switches rooms in-place.
 *
 * Every caller is a room switch (join/move to a breakout room or back to the
 * main room), so the freshly loaded page must not ask the user to go through
 * the landing page again.
 */
export const buildAccessTokenUrl = (token: string): string => {
  setSkipLandingOnce();
  const searchParams = new URLSearchParams(window.location.search);
  searchParams.set('access_token', token);
  return (
    location.protocol +
    '//' +
    location.host +
    window.location.pathname +
    '?' +
    searchParams.toString()
  );
};

/**
 * Whether the breakout rooms UI (footer icon and side panel) is available in
 * the current room. Everyone sees it once rooms are running; admins also get it
 * immediately in per-user AI agent rooms, where rooms are auto-created.
 */
export const canAccessBreakoutRooms = (metadata?: IRoomMetadata, isAdmin = false): boolean => {
  if (!metadata || metadata.isBreakoutRoom) {
    return false;
  }
  const features = metadata.roomFeatures;
  if (features?.breakoutRoomFeatures?.isActive) {
    return true;
  }
  return isAdmin && isAutoPerUserAISessionRoom(metadata);
};

/**
 * Whether the breakout rooms in this room are actually agentic sessions (each
 * one a 1-on-1 AI session) instead of regular breakout rooms.
 *
 * True when the room itself runs per-user AI sessions, or when every currently
 * running room has the AI agent enabled.
 */
export const isAgenticSessionsMode = (
  metadata?: IRoomMetadata,
  rooms?: Array<{ enableAiAgent?: boolean }>,
): boolean => {
  if (isAutoPerUserAISessionRoom(metadata)) {
    return true;
  }
  return !!rooms && rooms.length > 0 && rooms.every((r) => !!r.enableAiAgent);
};

/**
 * Extract the plain parent room id from a breakout room's metadata
 * `parentRoomId` value.
 *
 * Breakout metadata carries the parent reference as
 * `<plain parent roomId>:<parent DB table id>`. Room ids can never contain `:`
 * (protocol validation), so the plain id is everything before the last colon
 * and the suffix must be a positive integer. Anything else is rejected so that
 * a composite value can never be used as a room key.
 */
export const parseParentRoomId = (parentRoomId?: string): string => {
  if (!parentRoomId) {
    return '';
  }
  const sep = parentRoomId.lastIndexOf(':');
  if (sep <= 0) {
    return '';
  }
  const tableId = parentRoomId.slice(sep + 1);
  if (!/^\d+$/.test(tableId) || Number(tableId) <= 0) {
    return '';
  }
  return parentRoomId.slice(0, sep);
};

/**
 * Whether the current room is the participant's own 1-on-1 AI session room,
 * created by the server for an auto per-user AI agent room.
 *
 * The server marks such a room in its own metadata, so this stays reliable
 * even for a regular breakout room of a normal session that runs the AI agent
 * without allowing a return to the main room.
 */
export const isPerUserAISessionRoom = (metadata?: IRoomMetadata): boolean =>
  !!metadata?.isBreakoutRoom &&
  metadata.roomFeatures?.breakoutRoomFeatures?.isPerUserAiSession === true;

/**
 * Whether the user is sent back to the main room when the current breakout room
 * ends.
 *
 * An admin only observes other participants' rooms, so they always go back to
 * the main room they came from, never to the room's logout url. A learner of a
 * 1-on-1 AI session room started there, so its end is their session's end and
 * they never return; every other breakout room returns its learner.
 */
export const canReturnToMainRoom = (metadata?: IRoomMetadata, isAdmin = false): boolean => {
  if (!metadata?.isBreakoutRoom) {
    return false;
  }
  return isAdmin || !isPerUserAISessionRoom(metadata);
};

/**
 * Whether the participant needs a plain Leave action inside a breakout room.
 *
 * Only the learner of a 1-on-1 AI session room has no way back to the main room
 * and therefore needs a way out. Anyone else waits for the breakout room to end
 * and is returned automatically, so the leave controls stay hidden.
 * Admins keep their own end-room controls instead.
 */
export const canLeaveBreakoutRoom = (metadata?: IRoomMetadata, isAdmin = false): boolean =>
  !isAdmin && isPerUserAISessionRoom(metadata);

/**
 * Auto-return the current user from a (ended) breakout room to the main room.
 *
 * Used by the NATS handlers when a breakout room ends while the user is still
 * inside it. It is guarded so that even if multiple end-of-room signals fire
 * (e.g. BREAKOUT_ROOM_ENDED + SESSION_ENDED) the redirect is triggered once.
 *
 * Resolves to `true` if the redirect was initiated (the caller should skip any
 * ended/error screen), or `false` if the call failed and the caller should fall
 * back to normal ended-session handling.
 */
export const autoReturnToMainRoom = async (): Promise<boolean> => {
  const state = store.getState();
  const currentRoom = state.session.currentRoom;
  const meta = currentRoom.metadata;

  // Only relevant when the user is currently inside a breakout room.
  if (!meta?.isBreakoutRoom) {
    return Promise.resolve(false);
  }
  // Guard against double-triggering from multiple end-of-room signals.
  if (state.breakoutRoom.isReturningToMainRoom) {
    return Promise.resolve(false);
  }

  store.dispatch(setReturningToMainRoom(true));

  const req = create(BackToMainRoomReqSchema, {
    roomId: currentRoom.roomId,
    userId: state.session.currentUser?.userId ?? '',
    parentRoomId: parseParentRoomId(meta.parentRoomId),
  });

  return store
    .dispatch(breakoutRoomApi.endpoints.backToMain.initiate(req))
    .unwrap()
    .then((res) => {
      if (res.status && res.token) {
        window.location.replace(buildAccessTokenUrl(res.token));
        return true;
      }
      throw new Error(res.msg || 'failed');
    })
    .catch(() => {
      // Main room may also have ended: fall back to the normal ended screen.
      store.dispatch(setReturningToMainRoom(false));
      store.dispatch(
        addUserNotification({
          message: i18n.t('breakout-room.could-not-return-main-room'),
          typeOption: 'error',
          newInstance: true,
        }),
      );
      return false;
    });
};
