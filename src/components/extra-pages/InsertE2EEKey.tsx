import React, { Dispatch, FormEvent } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { addSelfInsertedE2EESecretKey } from '../../store/slices/roomSettingsSlice';

export interface IInsertE2EEKeyProps {
  setOpenConn: Dispatch<boolean>;
}

const InsertE2EEKey = ({ setOpenConn }: IInsertE2EEKeyProps) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const secretKey = data.get('secretKey');
    if (!secretKey) {
      return;
    }

    const encoder = new TextEncoder();
    // we'll hash the inserted password to make it stronger
    const hashBuffer = await window.crypto.subtle.digest(
      'SHA-256',
      encoder.encode(secretKey as string),
    );
    const base64String = btoa(
      String.fromCharCode(...new Uint8Array(hashBuffer)),
    );
    // key must contain 32 characters
    dispatch(addSelfInsertedE2EESecretKey(base64String.slice(0, 32)));
    setOpenConn(true);
  };

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
          <form className="px-8 pt-6 pb-8 mb-4" onSubmit={handleSubmit}>
            <div className="mb-6">
              <label
                className="block text-gray-700 text-base font-bold mb-2"
                htmlFor="secretKey"
              >
                {t('app.insert-secret-key')}
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                id="secretKey"
                type="password"
                placeholder="******************"
                name="secretKey"
              />
              <p className="text-red-400 text-xs italic">
                {t('app.insert-secret-help')}
              </p>
            </div>
            <div className="flex justify-center w-md">
              <button className="text-center py-1 px-3 mt-1 transition ease-in bg-primaryColor hover:bg-secondaryColor text-white font-semibold rounded-lg">
                {t('app.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InsertE2EEKey;
