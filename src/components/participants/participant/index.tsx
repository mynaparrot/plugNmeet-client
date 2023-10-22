import React from 'react';

import Avatar from './avatar';
import ParticipantName from './name';
import RaiseHandIcon from './icons/raiseHand';
import MicIcon from './icons/mic';
import WebcamIcon from './icons/webcam';
import ScreenShareIcon from './icons/screenShare';
import MenuIcon from './icons/menu';
import { store } from '../../../store';
import VisibilityIcon from './icons/visibility';
import PresenterIcon from './icons/presenterIcon';
import WaitingApproval from './waitingApproval';
import { IParticipant } from '../../../store/slices/interfaces/participant';

interface IParticipantComponentProps {
  participant: IParticipant;
  isRemoteParticipant: boolean;
  openRemoveParticipantAlert(name: string, userId: string, type: string): void;
}

const ParticipantComponent = ({
  participant,
  isRemoteParticipant,
  openRemoveParticipantAlert,
}: IParticipantComponentProps) => {
  const currentUser = store.getState().session.currentUser;

  const onOpenRemoveParticipantAlert = (user_id: string, type: string) => {
    if (user_id === participant.userId) {
      openRemoveParticipantAlert(participant.name, user_id, type);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between relative">
        <div className="left flex items-center ">
          <Avatar participant={participant} />
          <ParticipantName
            name={participant.name}
            isCurrentUser={currentUser?.userId === participant.userId}
          />
        </div>
        <div className="right ltr:ml-2 rtl:mr-2 flex-auto flex items-center justify-end">
          <RaiseHandIcon userId={participant.userId} />
          <VisibilityIcon userId={participant.userId} />
          <PresenterIcon userId={participant.userId} />
          <WebcamIcon userId={participant.userId} />
          <ScreenShareIcon userId={participant.userId} />
          <MicIcon
            userId={participant.userId}
            isRemoteParticipant={isRemoteParticipant}
          />
          {currentUser?.userId !== participant.userId ? (
            <MenuIcon
              userId={participant.userId}
              name={participant.name}
              isAdmin={participant.metadata.is_admin}
              openRemoveParticipantAlert={onOpenRemoveParticipantAlert}
            />
          ) : null}
        </div>
        {currentUser?.metadata?.is_admin ? (
          <div className="approve-wrap absolute ltr:right-0 rtl:left-0 top-5">
            <WaitingApproval
              userId={participant.userId}
              name={participant.name}
              openRemoveParticipantAlert={onOpenRemoveParticipantAlert}
            />
          </div>
        ) : null}
      </div>
    </>
  );
};

export default ParticipantComponent;
