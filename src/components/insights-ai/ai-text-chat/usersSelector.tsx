import React, { Dispatch, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../../store';
import { selectBasicParticipants } from '../../../store/slices/participantSlice';
import Dropdown, { ISelectOption } from '../../../helpers/ui/dropdown';

interface UsersSelectorProps {
  selectedUsers: Array<string>;
  setSelectedUsers: Dispatch<Array<string>>;
}

const UsersSelector = ({
  selectedUsers,
  setSelectedUsers,
}: UsersSelectorProps) => {
  const { t } = useTranslation();
  const participants = useAppSelector(selectBasicParticipants);

  return useMemo(() => {
    const users = participants.filter(
      (p) =>
        p.name !== '' && p.userId !== 'RECORDER_BOT' && p.userId !== 'RTMP_BOT',
    );

    const userOptions: ISelectOption[] = users.map((u) => ({
      value: u.userId,
      text: u.name,
    }));

    return (
      <div className="">
        <Dropdown
          id="allowed-users"
          label={t('insights.ai-text-chat.allowed-users')}
          value={selectedUsers}
          onChange={setSelectedUsers}
          multiple={true}
          options={userOptions}
        />
      </div>
    );
  }, [participants, selectedUsers, t, setSelectedUsers]);
};

export default UsersSelector;
