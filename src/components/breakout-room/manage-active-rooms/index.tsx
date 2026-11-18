import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import BroadcastMessageForm from './broadcastMessageForm';
import RoomLists from './roomLists';

import {
  useEndAllRoomsMutation,
  useGetBreakoutRoomsQuery,
} from '../../../store/services/breakoutRoomApi';
import { BreakoutRoomMessage } from '..';
import { useAppDispatch, useAppSelector } from '../../../store';
import { updateShowManageBreakoutRoomModal } from '../../../store/slices/bottomIconsActivitySlice';
import { isAgenticSessionsMode } from '../utils/breakoutRoom';

interface IManageActiveRoomsProps {
  setMessage: (message: BreakoutRoomMessage | null) => void;
}

const ManageActiveRooms = ({ setMessage }: IManageActiveRoomsProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [endAllRooms, { isLoading, data, isSuccess, error }] = useEndAllRoomsMutation();

  const metadata = useAppSelector((state) => state.session.currentRoom?.metadata);
  const breakoutRoomIsActive = useAppSelector(
    (state) => !!state.session.currentRoom.metadata?.roomFeatures?.breakoutRoomFeatures?.isActive,
  );
  // Same cache entry RoomLists polls, so no extra polling subscription here.
  const { data: roomsData } = useGetBreakoutRoomsQuery();
  const rooms = roomsData?.rooms ?? [];
  const agenticMode = isAgenticSessionsMode(metadata, rooms);
  // Nothing to end while the per-user sessions have not been auto-created yet.
  const showEndAll = breakoutRoomIsActive || rooms.length > 0;

  useEffect(() => {
    if (isSuccess && data) {
      if (data.status) {
        dispatch(updateShowManageBreakoutRoomModal(false));
      } else {
        setMessage({ text: t(data.msg), type: 'error' });
      }
    } else if (error) {
      const msg = (error as any)?.data?.msg ?? 'Unknown error';
      setMessage({ text: t(msg), type: 'error' });
    }
  }, [isSuccess, data, error, dispatch, t, setMessage]);

  const onEndAllRooms = () => {
    setMessage(null);
    endAllRooms();
  };

  return (
    <div className="manage-breakout-room-wrap">
      <BroadcastMessageForm setMessage={setMessage} />
      <RoomLists setMessage={setMessage} />
      {showEndAll && (
        <div className="btn pb-3 pt-4 flex items-end justify-end">
          <button
            className="primary-button h-9 ms-auto px-5 cursor-pointer text-sm font-medium bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
            onClick={onEndAllRooms}
            disabled={isLoading}
          >
            {agenticMode ? t('breakout-room.end-all-ai-sessions') : t('breakout-room.end-all')}
          </button>
        </div>
      )}
    </div>
  );
};

export default ManageActiveRooms;
