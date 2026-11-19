import React from 'react';

import { generateAvatarInitial } from '../../../helpers/utils';
import { IVisibleParticipantInfo } from '../../../store/slices/interfaces/participant';
import { AiIconSVG } from '../../../assets/Icons/AiIconSVG';
import { isAIAgentUserId } from '../../insights-ai/ai-agent/constants';

interface IAvatarProps {
  participant: IVisibleParticipantInfo;
}
const Avatar = ({ participant }: IAvatarProps) => {
  const initials = generateAvatarInitial(participant.name);
  const isAIAgent = isAIAgentUserId(participant.userId);

  return (
    <div className="thumb h-7 3xl:h-9 w-7 3xl:w-9 rounded-lg 3xl:rounded-xl bg-primary-color text-xs 3xl:text-base font-medium text-white flex items-center justify-center overflow-hidden">
      {participant.profilePic ? (
        <img
          src={participant.profilePic}
          alt={participant.name}
          className="w-full h-full object-cover"
        />
      ) : isAIAgent ? (
        <AiIconSVG classes="w-4 h-4 3xl:w-5 3xl:h-5" />
      ) : (
        initials
      )}
    </div>
  );
};

export default React.memo(Avatar);
