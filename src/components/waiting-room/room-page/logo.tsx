import React from 'react';
import useLogo from '../../../helpers/hooks/useLogo';

const Logo = () => {
  const logo = useLogo('waiting-room');

  return (
    <div
      className="h-[90px] waiting-room-logo flex"
      // style={{
      //   backgroundImage: `url("${logo}")`,
      // }}
    >
      <img
        className="h-full w-full object-contain"
        src={`${logo}`}
        alt="logo"
      />
    </div>
  );
};

export default Logo;
