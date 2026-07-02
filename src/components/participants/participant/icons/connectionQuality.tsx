import React from 'react';

import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';
import { ConnectionQuality } from '../../../../helpers/livekit/ConnectionQualityMonitor';
import IconWrapper from './iconWrapper';

interface ConnectionQualityIconProps {
  userId: string;
}

const ConnectionQualityIcon = ({ userId }: ConnectionQualityIconProps) => {
  const connectionQuality = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.connectionQuality,
  );

  const getColor = () => {
    if (connectionQuality === ConnectionQuality.Poor) {
      return '#f97316'; // orange
    }
    if (connectionQuality === ConnectionQuality.Lost) {
      return '#ef4444'; // red
    }
    return '';
  };

  if (
    connectionQuality === ConnectionQuality.Poor ||
    connectionQuality === ConnectionQuality.Lost
  ) {
    return (
      <IconWrapper>
        <i
          style={{ color: getColor() }}
          className="pnm-network text-xs 3xl:text-sm"
        />
      </IconWrapper>
    );
  }

  return null;
};

export default ConnectionQualityIcon;
