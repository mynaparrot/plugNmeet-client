import React, { useEffect } from 'react';
import SelectBtn from './selectBtn';
import SubtitleArea from './subtitleArea';

const SpeechToTextService = () => {
  useEffect(() => {
    return () => {
      console.log('unmount');
    };
  });
  return (
    <div>
      <SelectBtn />
      <SubtitleArea />
    </div>
  );
};

export default SpeechToTextService;
