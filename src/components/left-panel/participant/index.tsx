import React from 'react';
import { IParticipant } from '../../../store/slices/interfaces/participant';
import Avatar from './avatar';
import ParticipantName from './name';
import RaiseHandIcon from './icons/raiseHand';
import MicIcon from './icons/mic';
import WebcamIcon from './icons/webcam';
import MenuIcon from './icons/menu';
import { store } from '../../../store';
import VisibilityIcon from './icons/visibility';
import PresenterIcon from './icons/presenterIcon';

interface IParticipantComponentProps {
  participant: IParticipant;
}
const ParticipantComponent = ({ participant }: IParticipantComponentProps) => {
  const currentUser = store.getState().session.currentUser;

  return (
    <li className="mb-3 w-full list-none">
      <div className="flex items-center justify-between">
        <div className="left flex items-center ">
          <Avatar participant={participant} />
          <ParticipantName
            name={participant.name}
            isCurrentUser={currentUser?.userId === participant.userId}
          />
        </div>
        <div className="right ml-2 flex-auto flex items-center justify-end">
          <RaiseHandIcon userId={participant.userId} />
          <VisibilityIcon userId={participant.userId} />
          <PresenterIcon userId={participant.userId} />
          <MicIcon userId={participant.userId} />
          <WebcamIcon userId={participant.userId} />
          {currentUser?.metadata?.is_admin &&
          currentUser.userId !== participant.userId ? (
            <MenuIcon userId={participant.userId} name={participant.name} />
          ) : null}
        </div>
      </div>
    </li>
  );
};

export default ParticipantComponent;
