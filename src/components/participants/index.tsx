import React, { useEffect, useState } from 'react';
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
  const [participantElms, setParticipantElms] = useState<JSX.Element[]>([]);

  const session = store.getState().session;
  const currentUserUserId = session.currentUser?.userId;
  const allow_view_other_users_list =
    session.currentRoom.metadata?.room_features?.allow_view_other_users_list ??
    false;
  const currentIsAdmin = session.currentUser?.metadata?.is_admin ?? false;

  useEffect(() => {
    const tmp = participants.filter(
      (p) =>
        p.name !== '' && p.userId !== 'RECORDER_BOT' && p.userId !== 'RTMP_BOT',
    );
    if (!tmp.length) {
      return;
    }

    const elms: JSX.Element[] = [];
    tmp.forEach((participant) => {
      const remoteParticipant = currentRoom.participants.get(participant.sid);
      if (!currentIsAdmin && !allow_view_other_users_list) {
        if (
          !participant.metadata.is_admin &&
          currentUserUserId !== participant.userId
        ) {
          return;
        }
      }
      elms.push(
        <ParticipantComponent
          key={participant.sid}
          participant={participant}
          remoteParticipant={remoteParticipant}
        />,
      );
    });

    if (elms.length) {
      setParticipantElms(elms);
    }
    //eslint-disable-next-line
  }, [participants]);

  const render = () => {
    if (!participantElms.length) {
      return null;
    }
    return (
      <div className="inner-wrapper relative z-20">
        <div className="top flex items-center justify-between font-medium mb-3 xl:mb-5">
          <p className="text-sm text-black dark:text-white">
            {t('left-panel.participants', {
              total: participantElms.length,
            })}
          </p>
        </div>

        <div className="all-participants-wrap">{participantElms}</div>
      </div>
    );
  };

  return render();
};

export default ParticipantsComponent;
