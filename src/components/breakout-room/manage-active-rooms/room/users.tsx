import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from '@bufbuild/protobuf';
import {
  BreakoutRoomUser,
  MoveBreakoutRoomUserReqSchema,
  ReInviteBreakoutRoomReqSchema,
} from 'plugnmeet-protocol-js';
import { chunk } from 'es-toolkit';
import { BreakoutRoomMessage } from '../..';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';

import { generateAvatarInitial } from '../../../../helpers/utils';
import {
  useGetBreakoutRoomsQuery,
  useMoveUserMutation,
  useReInviteMutation,
} from '../../../../store/services/breakoutRoomApi';
import { store } from '../../../../store';

interface IBreakoutRoomUsersProps {
  users: Array<BreakoutRoomUser>;
  // 'room' renders the in-room variant (Main Room + other rooms as move targets,
  // with a re-invite action); 'unassigned' renders online main-room users who are
  // in no breakout room (breakout rooms only as move targets, no re-invite).
  variant?: 'room' | 'unassigned';
  breakoutRoomId?: string;
  setMessage: (message: BreakoutRoomMessage | null) => void;
}
const BreakoutRoomUsers = ({
  users,
  variant = 'room',
  breakoutRoomId,
  setMessage,
}: IBreakoutRoomUsersProps) => {
  const { t } = useTranslation();
  const [reInvite, { isLoading }] = useReInviteMutation();
  const [moveUser, { isLoading: isMoving }] = useMoveUserMutation();
  const { data: roomsData } = useGetBreakoutRoomsQuery();

  // Move targets. Uses the deduped cache query, so no prop drilling is needed.
  //   - 'room' variant: every OTHER breakout room + the main room (empty id).
  //   - 'unassigned' variant: breakout rooms ONLY (the user is already in the main
  //     room, so there is no "current room" to exclude).
  const moveTargets = useMemo(() => {
    const targets: Array<{ id: string; title: string }> = [];
    if (variant === 'unassigned') {
      for (const r of roomsData?.rooms ?? []) {
        targets.push({ id: r.id, title: r.title });
      }
    } else {
      targets.push({ id: '', title: t('breakout-room.main-room') });
      for (const r of roomsData?.rooms ?? []) {
        if (r.id !== breakoutRoomId) {
          targets.push({ id: r.id, title: r.title });
        }
      }
    }
    return targets;
  }, [roomsData, breakoutRoomId, t, variant]);

  const moveUserTo = (
    name: string,
    userId: string,
    targetRoomId: string,
    targetTitle: string,
  ) => {
    // The server resolves the parent room from the request's token, so passing
    // the breakout room's roomId here is harmless; we still pass the parent id.
    const currentRoom = store.getState().session.currentRoom;
    const roomId =
      currentRoom?.metadata?.parentRoomId || currentRoom?.roomId || '';

    moveUser(
      create(MoveBreakoutRoomUserReqSchema, {
        breakoutRoomId: targetRoomId,
        userId,
        roomId,
      }),
    )
      .unwrap()
      .then((res) => {
        if (res.status) {
          setMessage({
            text: t('breakout-room.move-success', { name, room: targetTitle }),
            type: 'info',
          });
          setTimeout(() => setMessage(null), 5000);
        } else {
          setMessage({
            text: t(res.msg ?? 'breakout-room.move-failed'),
            type: 'error',
          });
        }
      })
      .catch((e) => {
        setMessage({
          text: t((e as any)?.data?.msg ?? 'breakout-room.move-failed'),
          type: 'error',
        });
      });
  };

  const userChunks = useMemo(() => {
    // proto3 JSON (toJson in handleProtobufResponse) omits empty repeated
    // fields, so rooms created without assigned users have no `users` key.
    const sortedUsers = [...(users ?? [])].sort(
      (a, b) => (b.joined ? 1 : 0) - (a.joined ? 1 : 0),
    );
    return chunk(sortedUsers, 5);
  }, [users]);

  const reInviteUser = (name: string, userId: string) => {
    // The server resolves the parent room from the request's token, so passing
    // the breakout room's roomId here is harmless; we still pass the parent id
    // for clarity.
    const currentRoom = store.getState().session.currentRoom;
    const roomId =
      currentRoom?.metadata?.parentRoomId || currentRoom?.roomId || '';

    reInvite(
      create(ReInviteBreakoutRoomReqSchema, { breakoutRoomId, userId, roomId }),
    )
      .unwrap()
      .then((res) => {
        if (res.status) {
          setMessage({
            text: t('breakout-room.invitation-sent', {
              name,
            }),
            type: 'info',
          });
          setTimeout(() => setMessage(null), 5000);
        } else {
          setMessage({
            text: t(res.msg ?? 'breakout-room.invitation-sent-error'),
            type: 'error',
          });
        }
      })
      .catch((e) => {
        setMessage({
          text: t(
            (e as any)?.data?.msg ?? 'breakout-room.invitation-sent-error',
          ),
          type: 'error',
        });
      });
  };

  return (
    <div className="flex flex-nowrap items-start -mx-2 mt-5">
      {userChunks.map((chunk, i) => (
        <ul
          key={`chunk-${i}`}
          className="flex flex-col gap-y-2 px-2 border-e border-solid border-Gray-200 dark:border-Gray-800 last:border-e-0"
        >
          {chunk.map((user) => (
            <li key={user.id} className="flex items-center gap-2 text-sm">
              <div
                className={`thumb h-6 w-6 rounded-full text-xs font-medium text-white flex items-center justify-center overflow-hidden shrink-0 ${
                  user.joined ? 'bg-green-500' : 'bg-red-500'
                }`}
                title={
                  user.joined
                    ? t('breakout-room.user-joined')
                    : t('breakout-room.not-joined')
                }
              >
                {generateAvatarInitial(user.name)}
              </div>
              <span className="text-Gray-950 dark:text-white break-all">
                {user.name}
              </span>
              <div className="ms-auto flex items-center gap-2">
                <Menu as="div">
                  {() => (
                    <>
                      <MenuButton
                        disabled={isMoving}
                        className="primary-button h-6 px-3 cursor-pointer text-xs font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('breakout-room.move')}
                      </MenuButton>
                      <MenuItems
                        anchor="bottom end"
                        transition
                        className="ltr:origin-top-right rtl:origin-top-left z-20 w-[244px] shadow-dropdown-menu rounded-[15px] overflow-hidden border border-Gray-100 dark:border-Gray-700 bg-white dark:bg-dark-primary p-2 ring-0 focus:outline-hidden transition ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150"
                      >
                        {moveTargets.map((target) => (
                          <MenuItem key={target.id}>
                            <button
                              onClick={() =>
                                moveUserTo(
                                  user.name,
                                  user.id,
                                  target.id,
                                  target.title,
                                )
                              }
                              className="h-7 cursor-pointer w-full flex items-center hover:bg-Gray-50 dark:hover:bg-dark-secondary2 text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-white px-2 3xl:px-3 rounded-lg transition-all duration-300 relative"
                            >
                              <span className="truncate">{target.title}</span>
                            </button>
                          </MenuItem>
                        ))}
                      </MenuItems>
                    </>
                  )}
                </Menu>
                {variant === 'room' && !user.joined && (
                  <button
                    onClick={() => reInviteUser(user.name, user.id)}
                    className="primary-button h-6 px-3 cursor-pointer text-xs font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    {t('breakout-room.invite')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
};

export default BreakoutRoomUsers;
