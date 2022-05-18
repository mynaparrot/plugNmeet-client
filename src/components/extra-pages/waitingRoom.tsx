import React from 'react';
import { useTranslation } from 'react-i18next';

const WaitingRoom = () => {
  const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';
  const logo = (window as any).CUSTOM_LOGO ?? `${assetPath}/imgs/main-logo.png`;
  const { t } = useTranslation();
  return (
    <>
      <div className="guest-lobby flex items-center justify-center w-full h-screen">
        <div className="guest-lobby-inner">
          <div className="logo w-20 m-auto relative z-20">
            <div
              className={`${
                (window as any).CUSTOM_LOGO ? 'h-[45px]' : 'h-[45px]'
              } header-logo h-full bg-contain bg-no-repeat`}
              style={{
                backgroundImage: `url("${logo}")`,
              }}
            />
          </div>
          <div className="divider my-5 h-[2px] w-full max-w-[50px] bg-primaryColor m-auto"></div>
          <h2 className="headline text-2xl text-center">Guest Lobby</h2>
          <div className="loading-wrap relative h-24">
            <div className="loading absolute text-center top-3 z-[999] left-0 right-0 m-auto">
              <div className="lds-ripple">
                <div className="border-secondaryColor" />
                <div className="border-secondaryColor" />
              </div>
            </div>
          </div>
          <p>{t('notifications.waiting-for-approval')}</p>
        </div>
      </div>
    </>
  );
};

export default WaitingRoom;
