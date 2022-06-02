import React from 'react';

import { BreakoutRoomUser } from '../../../../store/services/breakoutRoomApiTypes';

interface IBreakoutRoomUsersProps {
  users: Array<BreakoutRoomUser>;
}
const BreakoutRoomUsers = ({ users }: IBreakoutRoomUsersProps) => {
  return (
    <div className="">
      {users.map((user) => {
        return (
          <p
            className="inline-block pr-2 mr-2 border-r border-solid border-black leading-4 last:border-none last:mr-0 last:pr-0"
            key={user.id}
          >
            {user.name}
          </p>
        );
      })}
    </div>
  );
};

export default BreakoutRoomUsers;
