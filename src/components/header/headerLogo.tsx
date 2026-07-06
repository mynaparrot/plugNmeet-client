import React from 'react';
import useLogo from '../../helpers/hooks/useLogo';

const HeaderLogo = () => {
  const logo = useLogo();
  return (
    <div className="cursor-pointer h-[35px] md:h-[45px] w-auto max-w-[100px] md:max-w-[120px] flex items-center shrink-0 overflow-hidden">
      <img
        className="max-h-full max-w-full object-contain ltr:object-left rtl:object-right cursor-default"
        src={logo}
        alt="logo"
      />
    </div>
  );
};

export default HeaderLogo;
