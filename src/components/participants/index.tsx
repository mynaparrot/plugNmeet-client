import React from 'react';
import { useTranslation } from 'react-i18next';
import { Room } from 'livekit-client';

import { store, useAppSelector } from '../../store';
import ParticipantComponent from './participant';
import { participantsSelector } from '../../store/slices/participantSlice';

interface IParticipantsComponentProps {
  currentRoom: Room;
}

const ParticipantsComponent = ({
  currentRoom,
}: IParticipantsComponentProps) => {
  const participants = useAppSelector(participantsSelector.selectAll);
  const { t } = useTranslation();

  const renderParticipants = () => {
    const session = store.getState().session;
    const currentUserUserId = session.currentUser?.userId;
    const allow_view_other_users_list =
      session.currentRoom.metadata?.room_features
        ?.allow_view_other_users_list ?? false;
    const currentIsAdmin = session.currentUser?.metadata?.is_admin ?? false;

    return participants.map((participant) => {
      const remoteParticipant = currentRoom.participants.get(participant.sid);
      if (!currentIsAdmin && !allow_view_other_users_list) {
        if (
          !participant.metadata.is_admin &&
          currentUserUserId !== participant.userId
        ) {
          return;
        }
      }
      return (
        <ParticipantComponent
          key={participant.sid}
          participant={participant}
          remoteParticipant={remoteParticipant}
        />
      );
    });
  };

  return (
    <div className="inner-wrapper relative z-20">
      <div className="top flex items-center justify-between font-medium mb-3 xl:mb-5">
        <p className="text-sm text-black">
          {t('left-panel.participants', {
            total: participants.length,
          })}
        </p>
      </div>

      <div className="all-participants-wrap">{renderParticipants()}</div>
    </div>
  );
};

export default ParticipantsComponent;
