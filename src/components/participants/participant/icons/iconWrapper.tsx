import React, { ReactNode } from 'react';

const IconWrapper = ({ children }: { children: ReactNode }) => {
  return (
    <div className="icon-wrapper w-6 3xl:w-8 h-6 3xl:h-8 flex items-center justify-center">
      {children}
    </div>
  );
};

export default IconWrapper;
