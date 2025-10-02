import React, { ReactNode } from 'react';

const IconWrapper = ({ children }: { children: ReactNode }) => {
  return (
    <div className="icon-wrapper w-5 3xl:w-6 h-5 3xl:h-6 flex items-center justify-center">
      {children}
    </div>
  );
};

export default IconWrapper;
