import React from 'react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../store';
import { updateShowManageBreakoutRoomModal } from '../../store/slices/bottomIconsActivitySlice';
import FormElems from './form';
import ManageActiveRooms from './manage-active-rooms';
import Modal from '../../helpers/ui/modal';

const BreakoutRoom = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const breakoutRoomIsActive = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures?.breakoutRoomFeatures
        ?.isActive,
  );

  return (
    <Modal
      show={true}
      onClose={() => dispatch(updateShowManageBreakoutRoomModal(false))}
      title={t('breakout-room.modal-title')}
      customClass="breakoutRoomModal"
      maxWidth="max-w-5xl"
    >
      <div className="mt-4">
        {breakoutRoomIsActive ? <ManageActiveRooms /> : <FormElems />}
      </div>
    </Modal>
  );
};

export default BreakoutRoom;
