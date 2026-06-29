import React from 'react';

import { useAppSelector } from '../../store';
import { selectAllReactions } from '../../store/slices/reactionsSlice';
import ReactionFloatItem from './ReactionFloatItem';

const ReactionsOverlay = () => {
  const reactions = useAppSelector(selectAllReactions);

  if (!reactions.length) {
    return null;
  }

  return (
    <div className="reactions-overlay pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      {reactions.map((reaction) => (
        <ReactionFloatItem key={reaction.id} reaction={reaction} />
      ))}
    </div>
  );
};

export default ReactionsOverlay;
