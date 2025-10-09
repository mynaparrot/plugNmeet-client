import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BreakoutRoomUser, DataMsgBodyType } from 'plugnmeet-protocol-js';
import { chunk } from 'es-toolkit';

import { generateAvatarInitial } from '../../../../helpers/utils';
import { getNatsConn } from '../../../../helpers/nats';
import { BreakoutRoomMessage } from '../../index';

interface IBreakoutRoomUsersProps {
  users: Array<BreakoutRoomUser>;
  breakoutRoomId: string;
  setMessage: (message: BreakoutRoomMessage | null) => void;
}
const BreakoutRoomUsers = ({
  users,
  breakoutRoomId,
  setMessage,
}: IBreakoutRoomUsersProps) => {
  const { t } = useTranslation();

  const userChunks = useMemo(() => {
    const sortedUsers = [...users].sort(
      (a, b) => Number(b.joined) - Number(a.joined),
    );
    return chunk(sortedUsers, 5);
  }, [users]);

  const pushUser = (name: string, userId: string) => {
    const conn = getNatsConn();
    conn.sendDataMessage(
      DataMsgBodyType.PUSH_JOIN_BREAKOUT_ROOM,
      breakoutRoomId,
      userId,
    );
    setMessage({
      text: t('breakout-room.you-pushed-user', {
        name,
      }),
      type: 'info',
    });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="flex flex-nowrap items-start -mx-2 mt-5">
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
              {!user.joined && (
                <button
                  onClick={() => pushUser(user.name, user.id)}
                  className="ml-auto h-6 px-3 cursor-pointer text-xs font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
                >
                  {t('breakout-room.push')}
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
