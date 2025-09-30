import React, { ReactNode } from 'react';

const IconWrapper = ({ children }: { children: ReactNode }) => {
  return (
    <div className="icon-wrapper w-6 h-6 flex items-center justify-center">
      {children}
    </div>
  );
};

export default IconWrapper;
