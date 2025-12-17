import React, { Dispatch, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { addSelfInsertedE2EESecretKey } from '../../store/slices/roomSettingsSlice';
import { useAppDispatch } from '../../store';

export interface IInsertE2EEKeyProps {
  setOpenConn: Dispatch<boolean>;
}

const InsertE2EEKey = ({ setOpenConn }: IInsertE2EEKeyProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const secretKey = data.get('secretKey');
    if (!secretKey) {
      toast(t('notifications.e2ee-empty-key-msg'), {
        type: 'error',
      });
      return;
    }

    // Pass the plain text secret. Key derivation will be handled later.
    // this password will clean up as soon as key generation is completed
    dispatch(addSelfInsertedE2EESecretKey(secretKey as string));
    setOpenConn(true);
  };

  return (
    <div
      id="errorPage"
      className="error-page h-screen w-full flex items-center justify-center relative bg-Gray-100 dark:bg-dark-primary"
    >
      <div
        className="overlay absolute w-full h-full top-0 left-0 bg-center dark:opacity-10"
        style={{
          backgroundImage: `url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100%25" height="100%25"%3E%3Cpattern id="bg" patternUnits="userSpaceOnUse" width="20" height="20"%3E%3Cg opacity="0.7"%3E%3Crect x="10" y="10" width="4" height="4" rx="2" fill="%23C2DAF2" /%3E%3C/g%3E%3C/pattern%3E%3Crect width="100%25" height="100%25" fill="url(%23bg)" /%3E%3C/svg%3E')`,
        }}
      ></div>
      <div className="content relative z-20 w-full max-w-xl flex items-center min-h-64 3xl:min-h-80 text-center rounded-2xl border border-Gray-300 dark:border-Gray-800 overflow-hidden bg-Gray-50 dark:bg-dark-primary px-10 py-10">
        <div className="inner w-full">
          <form className="px-8 pt-6 pb-8 mb-4" onSubmit={handleSubmit}>
            <div className="mb-6">
              <label
                className="block text-gray-700 dark:text-white text-base font-bold mb-2"
                htmlFor="secretKey"
              >
                {t('app.insert-secret-key')}
              </label>
              <input
                className="shadow appearance-none border rounded-sm w-full py-2 px-3 text-gray-700 dark:text-white mb-3 leading-tight focus:outline-hidden focus:shadow-outline"
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
              <button className="text-center py-1 px-3 mt-1 transition ease-in bg-primary-color hover:bg-secondary-color text-white font-semibold rounded-lg cursor-pointer">
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
