import React from 'react';
import useLogo from '../../helpers/hooks/useLogo';

const HeaderLogo = () => {
  const logo = useLogo();

  return (
    <div className="header-logo cursor-pointer">
      <img className="header-logo-img" src={logo} alt="logo" />
    </div>
  );
};

export default HeaderLogo;
