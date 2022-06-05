import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import BroadcastingMsg from './broadcastingMsg';
import RoomLists from './roomLists';
import { useEndAllRoomsMutation } from '../../../store/services/breakoutRoomApi';
import { useAppDispatch } from '../../../store';
import { updateShowManageBreakoutRoomModal } from '../../../store/slices/bottomIconsActivitySlice';

const BreakoutRoomLists = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [disable, setDisable] = useState<boolean>(false);
  const [endAllRooms, { isLoading, data }] = useEndAllRoomsMutation();

  useEffect(() => {
    setDisable(!!isLoading);
  }, [isLoading]);

  useEffect(() => {
    if (data) {
      if (data.status) {
        toast(t('breakout-room.end-all-success'), {
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
  }, [data]);

  const endAll = () => {
    endAllRooms();
  };

  const render = () => {
    return (
      <div className="manage-breakout-room-wrap">
        <BroadcastingMsg />
        <RoomLists />
        <button
          className="mt-4 inline-flex justify-center px-3 py-1 text-sm font-medium text-white bg-primaryColor rounded-md hover:bg-secondaryColor focus:outline-none"
          onClick={() => endAll()}
          disabled={disable}
        >
          {t('breakout-room.end-all')}
        </button>
      </div>
    );
  };

  return render();
};

export default BreakoutRoomLists;
