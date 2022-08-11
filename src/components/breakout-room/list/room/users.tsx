import React from 'react';
import { useTranslation } from 'react-i18next';
import { BreakoutRoomUser } from '../../../../helpers/proto/plugnmeet_breakout_room_pb';

interface IBreakoutRoomUsersProps {
  users: Array<BreakoutRoomUser>;
}
const BreakoutRoomUsers = ({ users }: IBreakoutRoomUsersProps) => {
  const { t } = useTranslation();

  return (
    <div className="">
      {users.map((user) => {
        return (
          <p
            className="inline-block pr-2 mr-2 border-r border-solid border-black leading-4 last:border-none last:mr-0 last:pr-0"
            key={user.id}
          >
            {user.name} (
            {user.joined
              ? t('breakout-room.user-joined')
              : t('breakout-room.not-joined')}
            )
          </p>
        );
      })}
    </div>
  );
};

export default BreakoutRoomUsers;
