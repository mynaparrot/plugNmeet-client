import React from 'react';
import useLogo from '../../helpers/hooks/useLogo';

const HeaderLogo = () => {
  const logo = useLogo();

  return (
    <div
      className="h-[45px] header-logo flex"
      // style={{
      //   backgroundImage: `url("${logo}")`,
      // }}
    >
      <img
        className="h-full w-full object-contain ltr:object-left rtl:object-right"
        src={`${logo}`}
        alt="logo"
      />
    </div>
  );
};

export default HeaderLogo;
