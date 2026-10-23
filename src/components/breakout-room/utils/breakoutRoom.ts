import { create } from '@bufbuild/protobuf';
import { BackToMainRoomReqSchema } from 'plugnmeet-protocol-js';

import { store } from '../../../store';
import { breakoutRoomApi } from '../../../store/services/breakoutRoomApi';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';
import { setReturningToMainRoom } from '../../../store/slices/breakoutRoomSlice';
import i18n from '../../../helpers/i18n';

/**
 * Build the app URL for a fresh access token, reusing the current page's path
 * and query params. plugNmeet boots entirely from `?access_token=...`, so
 * redirecting the current tab to this URL switches rooms in-place.
 */
export const buildAccessTokenUrl = (token: string): string => {
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
