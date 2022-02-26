import React from 'react';

import { useAppSelector } from '../../../store';
import { activeSpeakersSelector } from '../../../store/slices/activeSpeakersSlice';
import SpeakerComponent from './speaker';

const ActiveSpeakers = () => {
  const activeSpeakers = useAppSelector(activeSpeakersSelector.selectAll);

  const render = () => {
    return activeSpeakers.map((speaker) => {
      return <SpeakerComponent key={speaker.sid} speaker={speaker} />;
    });
  };

  return (
    <div className="active-speakers-wrap flex w-full items-center justify-center absolute top-0 left-0 z-[9999]">
      {activeSpeakers.length ? render() : null}
    </div>
  );
};

export default React.memo(ActiveSpeakers);
