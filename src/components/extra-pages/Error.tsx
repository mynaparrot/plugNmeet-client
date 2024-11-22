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
      className="error-page h-screen w-full flex items-center justify-center bg-Gray-100"
      style={{
        backgroundImage: `url("${assetPath}/imgs/DotGrid.svg")`,
      }}
    >
      <div className="content relative z-20 w-96 rounded-2xl border border-Gray-300 overflow-hidden bg-Gray-50 px-10 py-10">
        <div className="inner">
          <h2 className="text-2xl font-bold text-Gray-950 mb-6 leading-4">
            {title}
          </h2>
          <p className="break-words text-sm leading-5 text-Gray-700">{text}</p>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
