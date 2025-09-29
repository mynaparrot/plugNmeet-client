import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BreakoutRoomUser } from 'plugnmeet-protocol-js';
import { chunk } from 'es-toolkit';

import { generateAvatarInitial } from '../../../../helpers/utils';

interface IBreakoutRoomUsersProps {
  users: Array<BreakoutRoomUser>;
}
const BreakoutRoomUsers = ({ users }: IBreakoutRoomUsersProps) => {
  const { t } = useTranslation();

  const userChunks = useMemo(() => {
    const sortedUsers = [...users].sort(
      (a, b) => Number(b.joined) - Number(a.joined),
    );
    return chunk(sortedUsers, 5);
  }, [users]);

  return (
    <div className="flex flex-nowrap items-start -mx-2">
      {userChunks.map((chunk, i) => (
        <ul
          key={`chunk-${i}`}
          className="flex flex-col gap-y-2 px-2 border-r border-solid border-Gray-200 last:border-r-0"
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
              <span className="text-Gray-950 break-all">{user.name}</span>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
};

export default BreakoutRoomUsers;
