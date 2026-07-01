import React, { useState } from 'react';

import { IReaction, REACTION_TTL_MS } from '../../store/slices/reactionsSlice';

interface IReactionFloatItemProps {
  reaction: IReaction;
}

const ReactionFloatItem = ({ reaction }: IReactionFloatItemProps) => {
  const [motion] = useState(() => ({
    left: 15 + Math.random() * 70,
    drift: (Math.random() * 2 - 1) * 40,
    size: 2.25 + Math.random() * 1.25,
    dur: REACTION_TTL_MS * (0.8 + Math.random() * 0.2),
  }));

  return (
    <div
      className="reaction-float absolute bottom-16 flex flex-col items-center select-none"
      style={
        {
          left: `${motion.left}%`,
          '--reaction-drift': `${motion.drift}px`,
          '--reaction-dur': `${motion.dur}ms`,
        } as React.CSSProperties
      }
    >
      <span
        className="leading-none inline-block max-w-[1.5em] overflow-hidden"
        style={{ fontSize: `${motion.size}rem` }}
      >
        {reaction.emoji}
      </span>
      {reaction.fromName !== '' && (
        <span className="mt-1 max-w-[8rem] truncate rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
          {reaction.fromName}
        </span>
      )}
    </div>
  );
};

export default ReactionFloatItem;
