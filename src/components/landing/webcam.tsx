import React, { SetStateAction } from 'react';
import { Menu, MenuButton, MenuItem, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

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
    <div className="cam-wrap relative cursor-pointer shadow-IconBox border border-Gray-300 rounded-2xl h-11 min-w-11 flex items-center justify-center transition-all duration-300 hover:bg-gray-200 text-Gray-950">
      {showVideoShareModal && (
        <ShareWebcamModal
          displayWebcamSelection={false}
          onSelectedDevice={setSelectedVideoDevice}
          selectedDeviceId={selectedVideoDevice}
        />
      )}
      <div
        className="w-11 h-11 relative flex items-center justify-center"
        onClick={() =>
          videoDevices.length === 0
            ? enableMediaDevices('video')
            : disableWebcam()
        }
      >
        {videoDevices.length === 0 ? (
          <>
            <Camera classes={'h-5 w-auto'} />
            <span className="add absolute -top-2 -right-2 z-10">
              <PlusIcon />
            </span>
          </>
        ) : (
          <Camera classes={'h-5 w-auto'} />
        )}
      </div>
      {videoDevices.length > 0 && (
        <div className="menu relative">
          <Menu as="div">
            {({ open }) => (
              <>
                <MenuButton
                  className={`w-[30px] h-11 flex items-center justify-center border border-Gray-300  rounded-r-2xl ${open ? 'bg-Gray-100' : 'bg-Gray-50'}`}
                >
                  <ArrowUp />
                </MenuButton>
                <Transition
                  as={'div'}
                  show={open}
                  enter="transition duration-100 ease-out"
                  enterFrom="transform scale-95 opacity-0"
                  enterTo="transform scale-100 opacity-100"
                  leave="transition duration-75 ease-out"
                  leaveFrom="transform scale-100 opacity-100"
                  leaveTo="transform scale-95 opacity-0"
                >
                  <div className="menu origin-top-right z-10 absolute ltr:left-0 rtl:right-0 bottom-12 border border-Gray-100 bg-white shadow-lg rounded-2xl overflow-hidden p-2 w-max">
                    <div className="title h-10 w-full flex items-center text-sm leading-none text-Gray-700 px-3 uppercase">
                      {t('landing.webcam-menu-title')}
                    </div>
                    {videoDevices.map((device, i) => (
                      <div className="" role="none" key={`${device.id}-${i}`}>
                        <MenuItem>
                          {() => (
                            <p
                              className={`h-10 w-full flex items-center text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50`}
                              onClick={() => setSelectedVideoDevice(device.id)}
                            >
                              {device.label}
                              {selectedVideoDevice === device.id ? (
                                <CheckMarkIcon />
                              ) : (
                                ''
                              )}
                            </p>
                          )}
                        </MenuItem>
                      </div>
                    ))}
                    <div className="divider w-[calc(100%+16px)] relative -left-2 h-1 bg-Gray-50 mt-2"></div>
                    <div className="title h-10 w-full flex items-center text-sm leading-none text-Gray-700 px-3 uppercase">
                      {t('landing.background-filter-title')}
                    </div>
                    <p
                      className="h-10 w-full flex items-center text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        dispatch(
                          updateShowVideoShareModal(!showVideoShareModal),
                        )
                      }
                    >
                      {t('landing.config-background-btn')}
                    </p>
                  </div>
                </Transition>
              </>
            )}
          </Menu>
        </div>
      )}
    </div>
  );
};

export default WebcamIcon;
