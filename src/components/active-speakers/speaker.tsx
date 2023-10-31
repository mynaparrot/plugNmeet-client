import React from 'react';
import { IActiveSpeaker } from '../../store/slices/interfaces/activeSpeakers';

interface ISpeakerProps {
  speaker: IActiveSpeaker;
}
const SpeakerComponent = ({ speaker }: ISpeakerProps) => {
  return (
    <div className="m-1 px-3 py-1 primaryColor text-[12px] rounded-2xl inline-flex items-center bg-white border border-solid border-white">
      <i className="pnm-mic-unmute text-[10px] secondaryColor ltr:mr-2 rtl:ml-2" />
      {speaker.name}
    </div>
  );
};

export default SpeakerComponent;
