import { useMemo } from 'react';

import { useAppSelector } from '../../store';
import { selectSpeakingParticipants } from '../../store/slices/activeSpeakersSlice';
import { participantsSelector } from '../../store/slices/participantSlice';

const useActiveSpeakers = () => {
  const activeSpeakers = useAppSelector(selectSpeakingParticipants);
  const participantIds = useAppSelector(participantsSelector.selectIds);

  return useMemo(() => {
    const participantIdSet = new Set(participantIds);
    return activeSpeakers.filter((speaker) => participantIdSet.has(speaker.userId));
  }, [activeSpeakers, participantIds]);
};

export default useActiveSpeakers;
