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

export interface BreakoutRoomMessage {
  text: string;
  type: 'info' | 'error';
}

const BreakoutRoom = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [message, setMessage] = useState<BreakoutRoomMessage | null>(null);

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
        setMessage({ text: t(data.msg ?? ''), type: 'error' });
      }
    } else if (error) {
      const msg = (error as any)?.data?.msg ?? 'Unknown error';
      setMessage({ text: t(msg), type: 'error' });
    }
  }, [isSuccess, data, error, dispatch, t]);

  const handleCreateBreakoutRooms = (req: CreateBreakoutRoomsReq) => {
    // clean previous error
    setMessage(null);
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
        {message && (
          <div
            className={`py-2 px-4 rounded-lg mb-4 text-sm ${
              message.type === 'error'
                ? 'text-red-600 bg-red-50 dark:bg-red-100 dark:text-red-700'
                : 'text-blue-600 bg-blue-50 dark:bg-blue-100 dark:text-blue-700'
            }`}
          >
            {message.text}
          </div>
        )}
        {breakoutRoomIsActive ? (
          <ManageActiveRooms setMessage={setMessage} />
        ) : (
          <FormElems
            createBreakoutRooms={handleCreateBreakoutRooms}
            isLoading={isLoading}
            setMessage={setMessage}
          />
        )}
      </div>
    </Modal>
  );
};

export default BreakoutRoom;
