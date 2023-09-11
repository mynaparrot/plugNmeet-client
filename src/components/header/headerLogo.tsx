import React from 'react';
import useLogo from '../../helpers/hooks/useLogo';

const HeaderLogo = () => {
  const logo = useLogo();

  return (
    <div
      className="h-[45px] header-logo bg-contain bg-no-repeat"
      style={{
        backgroundImage: `url("${logo}")`,
      }}
    />
  );
};

export default HeaderLogo;
