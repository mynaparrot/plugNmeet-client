import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../../store';
import Dropdown, { ISelectOption } from '../../../helpers/ui/dropdown';

interface RoomNumberSelectorProps {
  totalRooms: number;
  setTotalRooms: (num: number) => void;
  // optional lower cap, e.g. the 1-on-1 AI agent session limit
  maxRooms?: number;
}

const RoomNumberSelector = ({ totalRooms, setTotalRooms, maxRooms }: RoomNumberSelectorProps) => {
  const { t } = useTranslation();
  const allowedRooms = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.breakoutRoomFeatures?.allowedNumberRooms ??
      6,
  );
  const roomLimit = maxRooms && maxRooms > 0 ? Math.min(allowedRooms, maxRooms) : allowedRooms;

  const options: ISelectOption[] = Array.from({ length: roomLimit }, (_, i) => ({
    value: i + 1,
    text: String(i + 1),
  }));

  return (
    <div className="numbers-of-room w-full sm:w-56 mb-2 sm:me-10">
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
