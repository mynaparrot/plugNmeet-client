import React from 'react';

import Create from './create';
import ListPolls from './listPolls';

const PollsComponent = () => {
  return (
    <>
      <ListPolls />
      <Create />
    </>
  );
};

export default PollsComponent;
