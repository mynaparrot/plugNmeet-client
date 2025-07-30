import React, { ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  BreakoutRoom,
  BreakoutRoomSchema,
  CreateBreakoutRoomsReqSchema,
} from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { RoomType, UserType } from './types';
import { participantsSelector } from '../../../store/slices/participantSlice';
import useStorePreviousInt from '../../../helpers/hooks/useStorePreviousInt';
import { updateBreakoutRoomDroppedUser } from '../../../store/slices/breakoutRoomSlice';
import { useCreateBreakoutRoomsMutation } from '../../../store/services/breakoutRoomApi';
import { updateShowManageBreakoutRoomModal } from '../../../store/slices/bottomIconsActivitySlice';
import { RoomBox } from './roomBox';

const FromElems = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const totalParticipants = useAppSelector(participantsSelector.selectTotal);
  const droppedUser = useAppSelector((state) => state.breakoutRoom.droppedUser);

  const [totalRooms, setTotalRooms] = useState<number>(1);
  const preTotalRooms = useStorePreviousInt(totalRooms);
  const [roomDuration, setRoomDuration] = useState<number>(15);
  const [welcomeMsg, setWelcomeMsg] = useState<string>(
    store.getState().session.currentRoom.metadata?.welcomeMessage ?? '',
  );
  const [rooms, setRooms] = useState<Array<RoomType>>();
  const [users, setUsers] = useState<Array<UserType>>([]);
  const [createBreakoutRoom, { isLoading, data }] =
    useCreateBreakoutRoomsMutation();

  // we'll clean during unmount
  useEffect(() => {
    return () => {
      dispatch(
        updateBreakoutRoomDroppedUser({
          id: '',
          roomId: 0,
        }),
      );
    };
  }, [dispatch]);

  useEffect(() => {
    const participants = participantsSelector.selectAll(store.getState());
    // if length same this mean no changes
    if (users.length === participants.length) {
      return;
    }

    const tmp: Array<UserType> = [];
    participants.forEach((p) => {
      const has = users.filter((u) => u.id === p.userId);
      if (has.length) {
        tmp.push(has[0]);
      } else {
        tmp.push({
          id: p.userId,
          name: p.name,
          roomId: 0,
          joined: false,
        });
      }
    });

    setUsers(tmp);
  }, [totalParticipants, users]);

  // if room number decreases then we'll reset otherwise user will be missing
  useEffect(() => {
    if (totalRooms >= preTotalRooms) {
      return;
    }
    const participants = participantsSelector.selectAll(store.getState());
    const users: Array<UserType> = [];
    participants.forEach((p) => {
      users.push({
        id: p.userId,
        name: p.name,
        roomId: 0,
        joined: false,
      });
    });
    setUsers(users);
  }, [totalParticipants, totalRooms, preTotalRooms]);

  useEffect(() => {
    const rooms: Array<RoomType> = [
      {
        id: 0,
        name: t('breakout-room.main-room'),
      },
    ];
    for (let i = 0; i < totalRooms; i++) {
      rooms.push({
        id: i + 1,
        name: t('breakout-room.new-room', { num: i + 1 }),
      });
    }
    setRooms(rooms);
    //eslint-disable-next-line
  }, [totalRooms]);

  useEffect(() => {
    if (droppedUser.id === '') {
      return;
    }
    const newUsers = users.map((user) => {
      if (user.id === droppedUser.id) {
        user.roomId = droppedUser.roomId;
      }
      return user;
    });

    setUsers(newUsers);
    //eslint-disable-next-line
  }, [droppedUser]);

  useEffect(() => {
    if (!isLoading && data) {
      if (data.status) {
        toast(t('breakout-room.rooms-created'), {
          type: 'info',
        });
        dispatch(updateShowManageBreakoutRoomModal(false));
      } else {
        toast(t(data.msg), {
          type: 'error',
        });
      }
    }
    //eslint-disable-next-line
  }, [isLoading, data]);

  const renderBreakoutRoomNumbers = () => {
    const max =
      store.getState().session.currentRoom.metadata?.roomFeatures
        ?.breakoutRoomFeatures?.allowedNumberRooms ?? 6;

    const options: Array<ReactElement> = [];
    for (let i = 0; i < max; i++) {
      options.push(
        <option key={i} value={i + 1}>
          {i + 1}
        </option>,
      );
    }

    return (
      <div className="numbers-of-room w-full sm:w-56 mb-4 sm:ltr:mr-10 sm:rtl:ml-10">
        <label
          className="block text-sm font-medium text-Gray-800 mb-1"
          htmlFor="breakout-room-number"
        >
          {t('breakout-room.num-rooms')}
        </label>
        <select
          className="h-11 rounded-[15px] border border-Gray-300 bg-white shadow-input w-full px-3 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus"
          id="breakout-room-number"
          onChange={(e) => setTotalRooms(Number(e.currentTarget.value))}
        >
          {options}
        </select>
      </div>
    );
  };

  const randomSelection = () => {
    if (!users || !rooms) {
      return;
    }
    const tmp = [...users];
    const tmpRooms = [...rooms];
    tmpRooms.shift();

    for (let i = 0; i < tmp.length; i++) {
      const r = Math.floor(Math.random() * tmpRooms.length);
      tmp[i].roomId = tmpRooms[r].id;
    }

    setUsers(tmp);
  };

  const startBreakoutRooms = () => {
    const tmp: Array<BreakoutRoom> = [];
    rooms?.forEach((r) => {
      if (r.id !== 0) {
        const u = users.filter((u) => u.roomId === r.id);
        if (u.length) {
          const room = create(BreakoutRoomSchema, {
            id: `${r.id}`,
            title: r.name,
            users: u,
            duration: String(roomDuration),
            started: false,
            created: String(Date.now()),
          });
          tmp.push(room);
        }
      }
    });

    if (!tmp.length) {
      toast(t('breakout-room.need-one-user'), {
        type: 'error',
      });
      return;
    }

    const req = create(CreateBreakoutRoomsReqSchema, {
      duration: String(roomDuration),
      welcomeMsg: welcomeMsg,
      rooms: tmp,
    });
    createBreakoutRoom(req);
  };

  return (
    <div className="break-out-room-main-area">
      <div className="row flex flex-wrap justify-start items-end">
        {renderBreakoutRoomNumbers()}
        <div className="room-durations w-full sm:w-56 mb-4">
          <label
            className="block text-sm font-medium text-Gray-800 mb-1"
            htmlFor="breakout-room-duration"
          >
            {t('breakout-room.duration')}
          </label>
          <input
            className="h-11 rounded-[15px] border border-Gray-300 bg-white shadow-input w-full px-3 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus"
            id="breakout-room-duration"
            type="number"
            value={roomDuration}
            onChange={(e) => setRoomDuration(Number(e.currentTarget.value))}
          />
        </div>
      </div>
      <div className="row flex flex-wrap justify-between items-end">
        <div className="room-welcome-messages w-full sm:max-w-122 mb-4 sm:ltr:mr-10 sm:rtl:ml-10">
          <label
            className="block text-sm font-medium text-Gray-800 mb-1"
            htmlFor="breakout-room-welcome"
          >
            {t('breakout-room.welcome-msg')}
          </label>
          <textarea
            className="h-20 rounded-[15px] border border-Gray-300 bg-white shadow-input w-full px-3 py-2 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus"
            id="breakout-room-welcome"
            onChange={(e) => setWelcomeMsg(e.currentTarget.value)}
            value={welcomeMsg}
          ></textarea>
        </div>
        <div className="random-room-select mb-4 rtl:ml-6">
          <button
            className="h-9 w-auto ml-auto px-5 cursor-pointer text-sm font-medium bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
            onClick={randomSelection}
          >
            {t('breakout-room.random-selection')}
          </button>
        </div>
      </div>
      <div className="draggable-room-area overflow-hidden clear-both flex flex-wrap">
        {rooms?.map((room) => {
          return (
            <div
              className="room-box-wrap w-[calc(50%-6px)] m-[3px] sm:m-0 sm:w-auto"
              key={room.id}
            >
              <RoomBox
                roomId={room.id}
                name={room.name}
                users={users.filter((user) => user.roomId === room.id)}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-end mt-4">
        <button
          className="h-9 w-auto px-5 cursor-pointer text-sm font-medium bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
          onClick={startBreakoutRooms}
        >
          {t('breakout-room.start')}
        </button>
      </div>
    </div>
  );
};

export default FromElems;
