import React from 'react';

export interface IErrorPageProps {
  title: string;
  text: string;
}

const ErrorPage = ({ title, text }: IErrorPageProps) => {
  return (
    <div
      id="errorPage"
      className="error-page h-screen w-full flex items-center justify-center bg-Gray-100"
      style={{
        backgroundImage: `url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100%25" height="100%25"%3E%3Cpattern id="bg" patternUnits="userSpaceOnUse" width="20" height="20"%3E%3Cg opacity="0.7"%3E%3Crect x="10" y="10" width="4" height="4" rx="2" fill="%23C2DAF2" /%3E%3C/g%3E%3C/pattern%3E%3Crect width="100%25" height="100%25" fill="url(%23bg)" /%3E%3C/svg%3E')`,
      }}
    >
      <div className="content relative z-20 w-full max-w-xl flex items-center min-h-64 3xl:min-h-80 text-center rounded-2xl border border-Gray-300 overflow-hidden bg-Gray-50 px-10 py-10">
        <div className="inner w-full">
          <h2 className="text-xl 3xl:text-2xl font-semibold text-Gray-950 mb-6 leading-4">
            {title}
          </h2>
          <p className="break-words text-sm 3xl:text-base leading-5 text-Gray-950/90">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
