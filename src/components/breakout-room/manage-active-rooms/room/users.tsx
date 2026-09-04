import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from '@bufbuild/protobuf';
import {
  BreakoutRoomUser,
  ReInviteBreakoutRoomReqSchema,
} from 'plugnmeet-protocol-js';
import { chunk } from 'es-toolkit';
import { toast } from 'react-toastify';

import { generateAvatarInitial } from '../../../../helpers/utils';
import { useReInviteMutation } from '../../../../store/services/breakoutRoomApi';
import { store } from '../../../../store';

interface IBreakoutRoomUsersProps {
  users: Array<BreakoutRoomUser>;
  breakoutRoomId: string;
}
const BreakoutRoomUsers = ({
  users,
  breakoutRoomId,
}: IBreakoutRoomUsersProps) => {
  const { t } = useTranslation();
  const [reInvite, { isLoading }] = useReInviteMutation();

  const userChunks = useMemo(() => {
    const sortedUsers = [...users].sort(
      (a, b) => Number(b.joined) - Number(a.joined),
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
          toast(
            t('breakout-room.invitation-sent', {
              name,
            }),
            {
              type: 'info',
            },
          );
        } else {
          toast(res.msg ?? t('breakout-room.invitation-sent-error'), {
            type: 'error',
          });
        }
      })
      .catch((e) => {
        const msg =
          (e as any)?.data?.msg ?? t('breakout-room.invitation-sent-error');
        toast(msg, { type: 'error' });
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
              {!user.joined && (
                <button
                  onClick={() => reInviteUser(user.name, user.id)}
                  className="primary-button ms-auto h-6 px-3 cursor-pointer text-xs font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {t('breakout-room.invite')}
                </button>
              )}
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
};

export default BreakoutRoomUsers;
