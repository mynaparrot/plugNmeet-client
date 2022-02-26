import React from 'react';

export interface IErrorPageProps {
  title: string;
  text: string;
}

const ErrorPage = ({ title, text }: IErrorPageProps) => {
  const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';

  return (
    <div
      id="errorPage"
      className="error-page h-screen w-full flex items-center justify-center"
    >
      <img
        className="absolute w-full h-full left-0 top-0 object-cover pointer-events-none"
        src={`${assetPath}/imgs/app-banner.jpg`}
        alt="AppBG"
      />
      <div className="content relative z-20 text-center bg-white rounded-xl shadow-lg h-80 w-[450px] pt">
        <h2 className="text-3xl font-medium mb-4 mt-[88px]">{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
};

export default ErrorPage;
