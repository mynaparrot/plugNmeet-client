import React, { Dispatch, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { store, useAppSelector } from '../../../store';
import { participantsSelector } from '../../../store/slices/participantSlice';
import Dropdown, { ISelectOption } from '../../../helpers/ui/dropdown';

interface SpeechUsersSelectorProps {
  selectedSpeechUsers: Array<string>;
  setSelectedSpeechUsers: Dispatch<Array<string>>;
}

const SpeechUsersSelector = ({
  selectedSpeechUsers,
  setSelectedSpeechUsers,
}: SpeechUsersSelectorProps) => {
  const { t } = useTranslation();
  const totalParticipants = useAppSelector(participantsSelector.selectTotal);

  return useMemo(() => {
    const users = participantsSelector
      .selectAll(store.getState())
      .filter(
        (p) =>
          p.name !== '' &&
          p.userId !== 'RECORDER_BOT' &&
          p.userId !== 'RTMP_BOT',
      );

    const userOptions: ISelectOption[] = users.map((u) => ({
      value: u.userId,
      text: u.name,
    }));

    return (
      <div className="">
        <Dropdown
          id="speech-users"
          label={t('speech-services.speech-users-label')}
          value={selectedSpeechUsers}
          onChange={setSelectedSpeechUsers}
          multiple={true}
          options={userOptions}
        />
      </div>
    );
    //eslint-disable-next-line
  }, [totalParticipants, selectedSpeechUsers]);
};

export default SpeechUsersSelector;
