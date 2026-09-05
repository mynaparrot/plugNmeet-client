import { useMemo } from 'react';

import { store } from '../../../store';
import { UserType } from './types';

/** A pre-assigned user's form data: the breakout room (1-based) and display name. */
interface PreassignedUserAssignment {
  roomId: number;
  name: string;
}

/** The participant fields the pre-assignment prefill needs. */
interface BasicParticipant {
  userId: string;
  name: string;
}

/**
 * Pre-assignments (sent by the createRoom API) captured once when the form
 * opens: one room per entry, offline users stay in their assigned room (kept
 * during the participants sync). Returns the pre-assigned users map plus the
 * initial form values.
 */
export const usePreassignedRooms = (participants: BasicParticipant[]) => {
  // always static during runtime
  const { breakoutFeatures, preassignedRooms } = useMemo(() => {
    const breakoutFeatures =
      store.getState().session.currentRoom.metadata?.roomFeatures
        ?.breakoutRoomFeatures;
    const preassignedRooms = breakoutFeatures?.preassignedRooms ?? [];

    return { breakoutFeatures, preassignedRooms };
  }, []);

  const preassignedUsers = useMemo(() => {
    const map = new Map<string, PreassignedUserAssignment>();
    preassignedRooms.forEach((room, index) => {
      room.userIds.forEach((userId) => {
        if (!map.has(userId)) {
          const participant = participants.find((p) => p.userId === userId);
          map.set(userId, {
            roomId: index + 1,
            name: participant?.name || userId,
          });
        }
      });
    });
    return map;
  }, [preassignedRooms, participants]);

  const initialTotalRooms =
    preassignedRooms.length > 0 ? preassignedRooms.length : 1;
  const initialAllowReturnToMainRoom =
    preassignedRooms.length > 0
      ? !!breakoutFeatures?.allowReturnToMainRoom
      : true;
  const initialAllowSelfSelect =
    preassignedRooms.length > 0 ? !!breakoutFeatures?.allowSelfSelect : false;

  const initialCustomTitles = useMemo(() => {
    const titles: Record<number, string> = {};
    preassignedRooms.forEach((room, index) => {
      titles[index + 1] = room.title;
    });
    return titles;
  }, [preassignedRooms]);

  const initialUsers = useMemo(
    () =>
      Array.from(preassignedUsers.entries()).map(([id, assigned]) => ({
        id,
        name: assigned.name,
        roomId: assigned.roomId,
        joined: false,
      })),
    [preassignedUsers],
  );

  return {
    preassignedRooms,
    preassignedUsers,
    initialTotalRooms,
    initialCustomTitles,
    initialUsers,
    initialAllowReturnToMainRoom,
    initialAllowSelfSelect,
  };
};

/**
 * Rebuild the users list when the participants list changes: existing entries
 * win (a drag-moved roomId survives), online pre-assigned users get their real
 * name refreshed, offline pre-assigned users are appended back (never dropped),
 * and unknown online participants land in the main room.
 */
export const mergeUsersWithPreassigned = (
  participants: BasicParticipant[],
  users: UserType[],
  preassignedUsers: Map<string, PreassignedUserAssignment>,
): UserType[] => {
  const existingUsersMap = new Map(users.map((u) => [u.id, u]));

  const newUsers: UserType[] = participants.map((p) => {
    const existingUser = existingUsersMap.get(p.userId);
    if (existingUser) {
      if (preassignedUsers.has(p.userId)) {
        // a pre-assigned user is online: show their real name
        return { ...existingUser, name: p.name };
      }
      return existingUser;
    }
    return { id: p.userId, name: p.name, roomId: 0, joined: false };
  });

  // pre-assigned users who are offline must not be dropped from the form
  if (preassignedUsers.size) {
    const onlineIds = new Set(newUsers.map((u) => u.id));
    preassignedUsers.forEach((assigned, id) => {
      if (!onlineIds.has(id)) {
        newUsers.push(
          existingUsersMap.get(id) ?? {
            id,
            name: assigned.name,
            roomId: assigned.roomId,
            joined: false,
          },
        );
      }
    });
  }

  return newUsers;
};
