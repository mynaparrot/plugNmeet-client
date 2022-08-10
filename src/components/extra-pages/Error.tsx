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
      <div
        className={`error-app-bg absolute w-full h-full left-0 top-0 object-cover pointer-events-none bg-cover bg-center bg-no-repeat`}
        style={{
          backgroundImage: `url("${assetPath}/imgs/app-banner.jpg")`,
        }}
      />
      <div className="content relative z-20 text-center bg-white dark:bg-darkPrimary/90 rounded-xl shadow-lg h-80 w-[450px] flex items-center justify-center">
        <div className="inner text-center dark:text-darkText">
          <h2 className="text-3xl font-medium mb-4">{title}</h2>
          <p>{text}</p>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
