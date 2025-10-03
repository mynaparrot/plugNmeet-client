import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { CreateBreakoutRoomsReq } from 'plugnmeet-protocol-js';

import FormElems from './form';
import ManageActiveRooms from './manage-active-rooms';
import Modal from '../../helpers/ui/modal';

import { useAppDispatch, useAppSelector } from '../../store';
import { updateShowManageBreakoutRoomModal } from '../../store/slices/bottomIconsActivitySlice';
import { useCreateBreakoutRoomsMutation } from '../../store/services/breakoutRoomApi';

const BreakoutRoom = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [errorMsg, setErrorMsg] = useState<string>('');

  const breakoutRoomIsActive = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures?.breakoutRoomFeatures
        ?.isActive,
  );

  const [createBreakoutRoom, { isLoading, data, error, isSuccess }] =
    useCreateBreakoutRoomsMutation();

  useEffect(() => {
    if (isSuccess && data) {
      if (data.status) {
        toast(t('breakout-room.rooms-created'), {
          type: 'info',
        });
        dispatch(updateShowManageBreakoutRoomModal(false));
      } else {
        setErrorMsg(t(data.msg ?? ''));
      }
    } else if (error) {
      const msg = (error as any)?.data?.msg ?? 'Unknown error';
      setErrorMsg(t(msg));
    }
  }, [isSuccess, data, error, dispatch, t]);

  const handleCreateBreakoutRooms = (req: CreateBreakoutRoomsReq) => {
    // clean previous error
    setErrorMsg('');
    createBreakoutRoom(req);
  };

  return (
    <Modal
      show={true}
      onClose={() => dispatch(updateShowManageBreakoutRoomModal(false))}
      title={t('breakout-room.modal-title')}
      customClass="breakoutRoomModal"
      maxWidth="max-w-4xl"
    >
      <div className="mt-0">
        {errorMsg && (
          <div className="text-red-600 bg-red-50 dark:bg-red-100 dark:text-red-700 py-2 px-4 rounded-lg mb-4 text-sm">
            {errorMsg}
          </div>
        )}
        {breakoutRoomIsActive ? (
          <ManageActiveRooms setErrorMsg={setErrorMsg} />
        ) : (
          <FormElems
            createBreakoutRooms={handleCreateBreakoutRooms}
            isLoading={isLoading}
            setErrorMsg={setErrorMsg}
          />
        )}
      </div>
    </Modal>
  );
};

export default BreakoutRoom;
