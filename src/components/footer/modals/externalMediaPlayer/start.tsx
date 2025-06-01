import {
  Dialog,
  DialogTitle,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  DialogPanel,
  Button,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { updateShowExternalMediaPlayerModal } from '../../../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch } from '../../../../store';
import DirectLink from './directLink';
import Upload from './upload';
import { PopupCloseSVGIcon } from '../../../../assets/Icons/PopupCloseSVGIcon';

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
      <Dialog
        open={!isActive}
        as="div"
        className="relative z-10 focus:outline-hidden"
        onClose={() => false}
      >
        <div className="ExternalMediaPlayer fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel
              transition
              className="w-full max-w-lg bg-white border border-Gray-200 shadow-virtualPOP p-6 rounded-xl overflow-hidden duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0"
            >
              <DialogTitle
                as="h3"
                className="flex items-center justify-between text-lg font-semibold leading-7 text-Gray-950"
              >
                <span>{t('footer.modal.external-media-player-title')}</span>
                <Button onClick={() => closeStartModal()}>
                  <PopupCloseSVGIcon classes="text-Gray-600" />
                </Button>
              </DialogTitle>
              <div className="mt-8">
                <TabGroup vertical className="outline-hidden">
                  <TabList className="flex">
                    {items.map((item) => (
                      <Tab
                        key={item.id}
                        className={({ selected }) =>
                          classNames(
                            'w-full py-2 text-sm text-Gray-950 font-medium leading-5 border-b-4 border-solid transition ease-in outline-hidden',
                            selected ? 'border-Blue' : 'border-Blue/20',
                          )
                        }
                      >
                        <div className="name relative inline-block">
                          {item.title}
                        </div>
                      </Tab>
                    ))}
                  </TabList>
                  <TabPanels className="relative h-[calc(100%-45px)]">
                    {items.map((item) => (
                      <TabPanel
                        key={item.id}
                        className={`${
                          item.id === 2 || item.id === 3
                            ? 'polls h-full outline-hidden'
                            : 'pt-2 xl:pt-5 h-full overflow-auto scrollBar outline-hidden'
                        }`}
                      >
                        <>{item.elm}</>
                      </TabPanel>
                    ))}
                  </TabPanels>
                </TabGroup>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
      {/* <Transition appear show={!isActive} as={Fragment}>
        <Dialog
          as="div"
          className="External fixed inset-0 z-9999 overflow-y-auto"
          onClose={() => false}
        >
          <div className="min-h-screen px-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black opacity-30" />
            </TransitionChild>

            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-dark-primary shadow-xl rounded-2xl">
                <button
                  className="close-btn absolute top-8 ltr:right-6 rtl:left-6 w-[25px] h-[25px] outline-hidden"
                  type="button"
                  onClick={() => closeStartModal()}
                >
                  <span className="inline-block h-px w-[20px] bg-primary-color dark:bg-dark-text absolute top-0 left-0 rotate-45" />
                  <span className="inline-block h-px w-[20px] bg-primary-color dark:bg-dark-text absolute top-0 left-0 -rotate-45" />
                </button>

                <DialogTitle
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-white ltr:text-left rtl:text-right mb-2"
                >
                  {t('footer.modal.external-media-player-title')}
                </DialogTitle>
                <hr />
                <div className="mt-6">
                  <TabGroup vertical>
                    <TabList className="flex">
                      {items.map((item) => (
                        <Tab
                          key={item.id}
                          className={({ selected }) =>
                            classNames(
                              'w-full py-2 text-xs text-black dark:text-dark-text font-bold leading-5 border-b-4 border-solid transition ease-in',
                              selected
                                ? 'border-primary-color'
                                : 'border-primary-color/20',
                            )
                          }
                        >
                          <div className="name relative inline-block">
                            {item.title}
                          </div>
                        </Tab>
                      ))}
                    </TabList>
                    <TabPanels className="relative h-[calc(100%-45px)]">
                      {items.map((item) => (
                        <TabPanel
                          key={item.id}
                          className={`${
                            item.id === 2 || item.id === 3
                              ? 'polls h-full'
                              : 'pt-2 xl:pt-5 h-full overflow-auto scrollBar'
                          }`}
                        >
                          <>{item.elm}</>
                        </TabPanel>
                      ))}
                    </TabPanels>
                  </TabGroup>
                </div>
              </div>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition> */}
    </>
  );
};

export default StartPlaybackModal;
