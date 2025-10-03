import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../../store';
import Dropdown, { ISelectOption } from '../../../helpers/ui/dropdown';

interface RoomNumberSelectorProps {
  totalRooms: number;
  setTotalRooms: (num: number) => void;
}

const RoomNumberSelector = ({
  totalRooms,
  setTotalRooms,
}: RoomNumberSelectorProps) => {
  const { t } = useTranslation();
  const maxRooms = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.breakoutRoomFeatures
        ?.allowedNumberRooms ?? 6,
  );

  const options: ISelectOption[] = Array.from({ length: maxRooms }, (_, i) => ({
    value: i + 1,
    text: String(i + 1),
  }));

  return (
    <div className="numbers-of-room w-full sm:w-56 mb-2 sm:ltr:mr-10 sm:rtl:ml-10">
      <Dropdown
        id="breakout-room-number"
        label={t('breakout-room.num-rooms')}
        value={totalRooms}
        onChange={setTotalRooms}
        options={options}
      />
    </div>
  );
};

export default RoomNumberSelector;
