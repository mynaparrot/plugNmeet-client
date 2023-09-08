import React from 'react';
import useLogo from '../../../helpers/hooks/useLogo';

const Logo = () => {
  const logo = useLogo('waiting-room');

  return (
    <div
      className="h-[90px] header-logo bg-contain bg-no-repeat bg-center"
      style={{
        backgroundImage: `url("${logo}")`,
      }}
    />
  );
};

export default Logo;
