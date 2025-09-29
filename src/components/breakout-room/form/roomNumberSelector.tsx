import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../../store';

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

  const options = Array.from({ length: maxRooms }, (_, i) => (
    <option key={i + 1} value={i + 1}>
      {i + 1}
    </option>
  ));

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
        value={totalRooms}
        onChange={(e) => setTotalRooms(Number(e.currentTarget.value))}
      >
        {options}
      </select>
    </div>
  );
};

export default RoomNumberSelector;
