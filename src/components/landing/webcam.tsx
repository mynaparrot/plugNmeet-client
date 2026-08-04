import React, { SetStateAction } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { isSupported } from '@twilio/video-processors';

import { Camera } from '../../assets/Icons/Camera';
import { PlusIcon } from '../../assets/Icons/PlusIcon';
import { ArrowUp } from '../../assets/Icons/ArrowUp';
import { CheckMarkIcon } from '../../assets/Icons/CheckMarkIcon';
import { updateShowVideoShareModal } from '../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch, useAppSelector } from '../../store';
import { IMediaDevice } from '../../store/slices/interfaces/roomSettings';
import ShareWebcamModal from '../footer/modals/webcam';
import { inputMediaDeviceKind } from '../../helpers/utils';

interface WebcamIconProps {
  videoDevices: IMediaDevice[];
  enableMediaDevices(type: inputMediaDeviceKind): Promise<void>;
  disableWebcam(): void;
  setSelectedVideoDevice: (value: SetStateAction<string>) => void;
  selectedVideoDevice: string;
}

const WebcamIcon = ({
  videoDevices,
  enableMediaDevices,
  disableWebcam,
  setSelectedVideoDevice,
  selectedVideoDevice,
}: WebcamIconProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const showVideoShareModal = useAppSelector(
    (state) => state.bottomIconsActivity.showVideoShareModal,
  );

  return (
    <div className="cam-wrap relative cursor-pointer shadow-IconBox border border-Gray-300 rounded-2xl h-11 min-w-11 flex items-center justify-center transition-all duration-300 hover:bg-gray-200 dark:hover:bg-Gray-700 text-Gray-950 dark:text-white">
      {showVideoShareModal && (
        <ShareWebcamModal
          displayWebcamSelection={false}
          onSelectedDevice={setSelectedVideoDevice}
          selectedDeviceId={selectedVideoDevice}
        />
      )}
      <button
        type="button"
        aria-label="Webcam"
        className="w-11 h-11 relative flex items-center justify-center cursor-pointer focus-ring"
        onClick={() =>
          videoDevices.length === 0
            ? enableMediaDevices('video')
            : disableWebcam()
        }
      >
        {videoDevices.length === 0 ? (
          <>
            <Camera classes={'h-5 w-auto'} />
            <span className="add absolute -top-2 -end-2 z-10">
              <PlusIcon />
            </span>
          </>
        ) : (
          <Camera classes={'h-5 w-auto'} />
        )}
      </button>
      {videoDevices.length > 0 && (
        <div className="menu relative">
          <Menu as="div">
            {({ open }) => (
              <>
                <MenuButton
                  aria-label={t('landing.webcam-menu-title').toString()}
                  className={`w-[30px] h-11 flex items-center justify-center border border-Gray-300 rounded-e-2xl focus-ring ${open ? 'bg-Gray-100 dark:bg-Gray-800' : 'bg-Gray-50 dark:bg-Gray-700'}`}
                >
                  <ArrowUp />
                </MenuButton>
                <MenuItems
                  unmount={false}
                  transition
                  className="menu ltr:origin-top-right rtl:origin-top-left z-10 absolute ltr:left-auto md:ltr:left-0 ltr:-right-16 md:rtl:right-0 bottom-12 border border-Gray-100 dark:border-Gray-700 bg-white dark:bg-dark-primary shadow-lg rounded-2xl overflow-hidden p-2 w-max transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
                >
                  <div className="title h-9 w-full flex items-center text-xs leading-none text-Gray-700 dark:text-dark-text px-2 uppercase">
                    {t('landing.webcam-menu-title')}
                  </div>
                  {videoDevices.map((device, i) => (
                    <div className="" role="none" key={`${device.id}-${i}`}>
                      <MenuItem>
                        {() => (
                          <button
                            type="button"
                            className={`min-h-9 w-full flex items-center justify-between text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-white px-2 rounded-lg transition-all duration-300 hover:bg-Gray-50 dark:hover:bg-dark-secondary2 data-[focus]:bg-Gray-50 dark:data-[focus]:bg-dark-secondary2 focus-ring`}
                            onClick={() => setSelectedVideoDevice(device.id)}
                          >
                            <span dir="ltr">{device.label}</span>
                            {selectedVideoDevice === device.id ? (
                              <CheckMarkIcon />
                            ) : (
                              ''
                            )}
                          </button>
                        )}
                      </MenuItem>
                    </div>
                  ))}

                  {isSupported && (
                    <>
                      <div className="divider w-[calc(100%+16px)] relative -start-2 h-1 bg-Gray-50 dark:bg-Gray-700 mt-2"></div>
                      <div className="title h-9 w-full flex items-center text-xs leading-none text-Gray-700 dark:text-dark-text px-2 uppercase">
                        {t('landing.background-filter-title')}
                      </div>
                      <MenuItem>
                        {() => (
                          <button
                            type="button"
                            className="min-h-9 w-full flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-white px-2 rounded-lg transition-all duration-300 hover:bg-gray-50 dark:hover:bg-dark-secondary2 data-[focus]:bg-Gray-50 dark:data-[focus]:bg-dark-secondary2 cursor-pointer focus-ring"
                            onClick={() =>
                              dispatch(
                                updateShowVideoShareModal(!showVideoShareModal),
                              )
                            }
                          >
                            {t('landing.config-background-btn')}
                          </button>
                        )}
                      </MenuItem>
                    </>
                  )}
                </MenuItems>
              </>
            )}
          </Menu>
        </div>
      )}
    </div>
  );
};

export default WebcamIcon;
