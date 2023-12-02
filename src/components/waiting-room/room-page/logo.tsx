import React from 'react';
import useLogo from '../../../helpers/hooks/useLogo';

const Logo = () => {
  const logo = useLogo('waiting-room');

  return (
    <div className="waiting-room-logo">
      <img className="waiting-room-logo-img" src={`${logo}`} alt="logo" />
    </div>
  );
};

export default Logo;
