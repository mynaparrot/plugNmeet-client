import React from 'react';

import Create from './create';
import ListPolls from './listPolls';
import { store } from '../../store';

const PollsComponent = () => {
  const isAdmin = store.getState().session.currentUser?.metadata?.is_admin;
  return (
    <>
      <ListPolls />
      {isAdmin ? <Create /> : null}
    </>
  );
};

export default PollsComponent;
