import React, { useMemo } from 'react';

import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';
import { getConnectionQualityColor } from '../../../../helpers/utils';

interface IConnectionStatusProps {
  userId: string;
}
const ConnectionStatus = ({ userId }: IConnectionStatusProps) => {
  const connectionQuality = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.connectionQuality,
  );

  const color = useMemo(() => {
    return getConnectionQualityColor(connectionQuality);
  }, [connectionQuality]);

  return (
    <div className="connection-status cursor-pointer w-7 h-7 rounded-full bg-Gray-950/50 shadow-shadowXS flex items-center justify-center">
      <i style={{ color: color }} className="pnm-network text-[7px]" />
    </div>
  );
};

export default ConnectionStatus;
