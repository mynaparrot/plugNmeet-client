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
        <div className="btn pb-3 pt-4 bg-gray-50 dark:bg-transparent flex items-end justify-end">
          <button
            className="h-9 ml-auto px-5 flex items-center justify-center rounded-xl text-sm font-semibold text-white bg-Red-400 border border-Red-400 transition-all duration-300 hover:bg-Red-600 shadow-button-shadow"
            onClick={() => endAll()}
            disabled={disable}
          >
            {t('breakout-room.end-all')}
          </button>
        </div>
      </div>
    );
  };

  return render();
};

export default BreakoutRoomLists;
