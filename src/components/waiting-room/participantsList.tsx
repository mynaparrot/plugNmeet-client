import React from 'react';
import { useTranslation } from 'react-i18next';

import { IParticipant } from '../../store/slices/interfaces/participant';
import WaitingParticipantItem from './waitingParticipantItem';

interface IParticipantsListProps {
  waitingParticipants: IParticipant[];
}

const ParticipantsList = ({ waitingParticipants }: IParticipantsListProps) => {
  const { t } = useTranslation();

  return (
    <div className="waiting-list-wrap">
      <p className="text-lg my-4 text-Gray-950 font-medium ltr:text-left rtl:text-right">
        {t('waiting-room.list-waiting-participants', {
          count: waitingParticipants.length,
        })}
      </p>
      <div className="waiting-list scrollBar h-[122px] overflow-auto">
        <div className="waiting-list-inner pb-0.5 pr-0.5">
          {waitingParticipants.length > 0 ? (
            waitingParticipants.map((p) => (
              <WaitingParticipantItem key={p.userId} participant={p} />
            ))
          ) : (
            <p className="text-sm text-gray-500">
              {t('waiting-room.no-pending-user')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantsList;
