import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useVirtual from 'react-cool-virtual';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, store, useAppSelector } from '../../store';
import ParticipantComponent from './participant';
import { participantsSelector } from '../../store/slices/participantSlice';
import { IParticipant } from '../../store/slices/interfaces/participant';

const screenHeightSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.screenHeight,
  (screenHeight) => screenHeight,
);

const ParticipantsComponent = () => {
  const { t } = useTranslation();
  const allParticipants = useAppSelector(participantsSelector.selectAll);
  const screenHeight = useAppSelector(screenHeightSelector);

  const [participants, setParticipants] = useState<IParticipant[]>([]);
  const { outerRef, innerRef, items } = useVirtual({
    itemCount: participants.length,
  });

  const session = store.getState().session;
  const currentUserUserId = session.currentUser?.userId;
  const allow_view_other_users_list =
    session.currentRoom.metadata?.room_features?.allow_view_other_users_list ??
    false;
  const currentIsAdmin = session.currentUser?.metadata?.is_admin ?? false;

  useEffect(() => {
    if (!allParticipants) {
      return;
    }
    const tm: any = [...allParticipants];
    for (let i = 0; i < 40; i++) {
      tm.push(allParticipants[0]);
    }
    setParticipants(tm);
  }, [allParticipants]);

  const renderParticipant = (index) => {
    if (!participants.length || typeof participants[index] === 'undefined') {
      return null;
    }
    const participant = participants[index];
    const isRemoteParticipant = currentUserUserId !== participant.userId;
    if (!currentIsAdmin && !allow_view_other_users_list) {
      if (
        !participant.metadata.is_admin &&
        currentUserUserId !== participant.userId
      ) {
        return null;
      }
    }

    return (
      <ParticipantComponent
        key={participant.sid}
        participant={participant}
        isRemoteParticipant={isRemoteParticipant}
      />
    );
  };

  return (
    <div className="inner-wrapper relative z-20">
      <div className="top flex items-center justify-between font-medium mb-3 xl:mb-5">
        <p className="text-sm text-black dark:text-white">
          {t('left-panel.participants', {
            total: participants.length,
          })}
        </p>
      </div>

      <div
        ref={outerRef as any}
        style={{ height: screenHeight - 215, overflow: 'auto' }}
      >
        <div className="all-participants-wrap" ref={innerRef as any}>
          {items.map(({ index, measureRef }) => (
            <div key={index} ref={measureRef} id={`par-${index}`}>
              {renderParticipant(index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParticipantsComponent;
