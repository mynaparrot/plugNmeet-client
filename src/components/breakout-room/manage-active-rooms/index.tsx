import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import BroadcastMessageForm from './broadcastMessageForm';
import RoomLists from './roomLists';

import { useEndAllRoomsMutation } from '../../../store/services/breakoutRoomApi';
import { BreakoutRoomMessage } from '..';
import { useAppDispatch } from '../../../store';
import { updateShowManageBreakoutRoomModal } from '../../../store/slices/bottomIconsActivitySlice';

interface IManageActiveRoomsProps {
  setMessage: (message: BreakoutRoomMessage | null) => void;
}

const ManageActiveRooms = ({ setMessage }: IManageActiveRoomsProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [endAllRooms, { isLoading, data, isSuccess, error }] =
    useEndAllRoomsMutation();

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
      <div className="btn pb-3 pt-4 flex items-end justify-end">
        <button
          className="button-blue h-9 ml-auto px-5 cursor-pointer text-sm font-medium bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
          onClick={onEndAllRooms}
          disabled={isLoading}
        >
          {t('breakout-room.end-all')}
        </button>
      </div>
    </div>
  );
};

export default ManageActiveRooms;
