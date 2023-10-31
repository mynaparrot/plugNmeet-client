import React, { Fragment } from 'react';
import { Dialog, Tab, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { updateShowExternalMediaPlayerModal } from '../../../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch } from '../../../../store';
import DirectLink from './directLink';
import Upload from './upload';

interface IStartPlaybackModalProps {
  isActive: boolean;
}

const StartPlaybackModal = ({ isActive }: IStartPlaybackModalProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const items = [
    {
      id: 1,
      title: <>{t('footer.modal.external-media-player-direct-link')}</>,
      elm: <DirectLink />,
    },
    {
      id: 2,
      title: <>{t('footer.modal.external-media-player-upload-file')}</>,
      elm: <Upload />,
    },
  ];

  const closeStartModal = () => {
    dispatch(updateShowExternalMediaPlayerModal(false));
  };

  const classNames = (...classes) => {
    return classes.filter(Boolean).join(' ');
  };

  return (
    <>
      <Transition appear show={!isActive} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-[9999] overflow-y-auto"
          onClose={() => false}
        >
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
            </Transition.Child>

            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-darkPrimary shadow-xl rounded-2xl">
                <button
                  className="close-btn absolute top-8 ltr:right-6 rtl:left-6 w-[25px] h-[25px] outline-none"
                  type="button"
                  onClick={() => closeStartModal()}
                >
                  <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
                  <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
                </button>

                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-white ltr:text-left rtl:text-right mb-2"
                >
                  {t('footer.modal.external-media-player-title')}
                </Dialog.Title>
                <hr />
                <div className="mt-6">
                  <Tab.Group vertical>
                    <Tab.List className="flex">
                      {items.map((item) => (
                        <Tab
                          key={item.id}
                          className={({ selected }) =>
                            classNames(
                              'w-full py-2 text-xs text-black dark:text-darkText font-bold leading-5 border-b-4 border-solid transition ease-in',
                              selected
                                ? 'border-[#004d90]'
                                : 'border-[#004d90]/20',
                            )
                          }
                        >
                          <div className="name relative inline-block">
                            {item.title}
                          </div>
                        </Tab>
                      ))}
                    </Tab.List>
                    <Tab.Panels className="relative h-[calc(100%-45px)]">
                      {items.map((item) => (
                        <Tab.Panel
                          key={item.id}
                          className={`${
                            item.id === 2 || item.id === 3
                              ? 'polls h-full'
                              : 'pt-2 xl:pt-5 h-full overflow-auto scrollBar'
                          }`}
                        >
                          <>{item.elm}</>
                        </Tab.Panel>
                      ))}
                    </Tab.Panels>
                  </Tab.Group>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default StartPlaybackModal;
