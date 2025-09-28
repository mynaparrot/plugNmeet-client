import React from 'react';

import Avatar from './avatar';
import ParticipantName from './name';
import RaiseHandIcon from './icons/raiseHand';
import MicIcon from './icons/mic';
import WebcamIcon from './icons/webcam';
import ScreenShareIcon from './icons/screenShare';
import MenuIcon from './icons/menu';
import VisibilityIcon from './icons/visibility';
import PresenterIcon from './icons/presenterIcon';
import WaitingApproval from './waitingApproval';
import { IParticipant } from '../../../store/slices/interfaces/participant';
import { ICurrentUser } from '../../../store/slices/interfaces/session';

interface IParticipantComponentProps {
  participant: IParticipant;
  currentUser: ICurrentUser | undefined;
  isRemoteParticipant: boolean;
  openRemoveParticipantAlert(name: string, userId: string, type: string): void;
}

const ParticipantComponent = ({
  participant,
  currentUser,
  isRemoteParticipant,
  openRemoveParticipantAlert,
}: IParticipantComponentProps) => {
  const onOpenRemoveParticipantAlert = (user_id: string, type: string) => {
    if (user_id === participant.userId) {
      openRemoveParticipantAlert(participant.name, user_id, type);
    }
  };

  return (
    <div className="flex items-center justify-between relative w-full gap-2">
      <div className="left flex items-center gap-1.5 3xl:gap-[10px]">
        <Avatar participant={participant} />
        <ParticipantName
          name={participant.name}
          isCurrentUser={currentUser?.userId === participant.userId}
        />
      </div>
      <div className="right flex-auto flex items-center justify-end ml-2">
        <div className="icon-group flex items-center justify-center gap-1">
          <RaiseHandIcon userId={participant.userId} />
          <VisibilityIcon userId={participant.userId} />
          <PresenterIcon userId={participant.userId} />
          <WebcamIcon userId={participant.userId} />
          <ScreenShareIcon userId={participant.userId} />
          <MicIcon
            userId={participant.userId}
            isRemoteParticipant={isRemoteParticipant}
          />
          {currentUser?.userId !== participant.userId && (
            <MenuIcon
              userId={participant.userId}
              name={participant.name}
              isAdmin={participant.metadata.isAdmin}
              openRemoveParticipantAlert={onOpenRemoveParticipantAlert}
            />
          )}
        </div>
      </div>
      {currentUser?.metadata?.isAdmin && (
        <WaitingApproval
          userId={participant.userId}
          name={participant.name}
          openRemoveParticipantAlert={onOpenRemoveParticipantAlert}
        />
      )}
    </div>
  );
};

export default ParticipantComponent;
