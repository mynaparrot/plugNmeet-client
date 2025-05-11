import React, { ReactElement, useEffect, useState } from 'react';
import { Dialog, DialogTitle, Transition, Button } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useAppSelector, useAppDispatch } from '../../../../store';
import {
  updateIsActiveWebcam,
  updateShowVideoShareModal,
} from '../../../../store/slices/bottomIconsActivitySlice';
import { getInputMediaDevices } from '../../../../helpers/utils';
import PreviewWebcam from './previewWebcam';
import { addVideoDevices } from '../../../../store/slices/roomSettingsSlice';
import { PopupCloseSVGIcon } from '../../../../assets/Icons/PopupCloseSVGIcon';

interface IShareWebcamModal {
  onSelectedDevice: (deviceId: string) => void;
  displayWebcamSelection: boolean;
  selectedDeviceId: string;
}

const ShareWebcamModal = ({
  onSelectedDevice,
  displayWebcamSelection,
  selectedDeviceId,
}: IShareWebcamModal) => {
  const showVideoShareModal = useAppSelector(
    (state) => state.bottomIconsActivity.showVideoShareModal,
  );
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [selectedWebcam, setSelectWebcam] = useState<string>(selectedDeviceId);
  const [devices, setDevices] = useState<Array<ReactElement>>([]);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  useEffect(() => {
    const getDeviceWebcams = async () => {
      const inputDevices = await getInputMediaDevices('video');
      if (!inputDevices.video.length) {
        return;
      }

      const options = inputDevices.video.map((mic, index) => {
        return (
          <option value={mic.id} key={`device-id-${mic.id}-${index}`}>
            {mic.label}
          </option>
        );
      });

      setDevices(options);
      if (selectedDeviceId !== '') {
        setSelectWebcam(selectedDeviceId);
      } else {
        setSelectWebcam(inputDevices.video[0].id);
      }
      dispatch(addVideoDevices(inputDevices.video));
    };
    getDeviceWebcams().then();
    //eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (showVideoShareModal) {
      setIsOpen(true);
    }
  }, [showVideoShareModal]);

  const shareWebcam = async () => {
    onClose();
    if (!selectedWebcam) {
      return;
    }
    onSelectedDevice(selectedWebcam);
  };

  const onClose = () => {
    setIsOpen(false);
    dispatch(updateShowVideoShareModal(false));
    dispatch(updateIsActiveWebcam(false));
  };

  return !showVideoShareModal ? null : (
    <Transition
      show={isOpen}
      enter="transition duration-100 ease-out"
      enterFrom="transform scale-95 opacity-0"
      enterTo="transform scale-100 opacity-100"
      leave="transition duration-75 ease-out"
      leaveFrom="transform scale-100 opacity-100"
      leaveTo="transform scale-95 opacity-0"
    >
      <Dialog
        open={isOpen}
        onClose={() => false}
        id="VirtualBackgroundModel"
        className="fixed z-[99999] inset-0 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen py-5 px-2">
          <div className="fixed inset-0 bg-Gray-950/70" />

          <div className="popup-inner bg-white w-full max-w-lg 3xl:max-w-xl z-50 rounded-2xl overflow-hidden border border-Gray-200 shadow-virtualPOP">
            {displayWebcamSelection ? (
              <>
                <DialogTitle
                  as="h3"
                  className="flex items-center justify-between text-base 3xl:text-lg font-medium 3xl:font-semibold leading-7 text-Gray-950 pt-6 px-3 3xl:px-5 pb-2"
                >
                  <span>{t('footer.modal.select-webcam')}</span>
                  <Button onClick={() => onClose()}>
                    <PopupCloseSVGIcon classes="text-Gray-600" />
                  </Button>
                </DialogTitle>

                <div className="webcam-dropdown px-3 3xl:px-5 mb-4">
                  <select
                    value={selectedWebcam}
                    onChange={(e) => setSelectWebcam(e.target.value)}
                    className="block w-full py-2 px-3 border border-Gray-300 text-Gray-700 bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    {devices}
                  </select>
                </div>
              </>
            ) : null}

            <div className="w-full p-2">
              <PreviewWebcam deviceId={selectedWebcam} />
            </div>

            <div className="grid grid-cols-2 gap-5 pt-5 3xl:pt-8 pb-5 px-3 3xl:px-5 border-t border-Gray-100">
              <button
                className="w-full h-10 3xl:h-11 text-sm 3xl:text-base font-medium 3xl:font-semibold bg-Gray-25 hover:bg-Blue hover:text-white border border-Gray-300 rounded-[15px] flex justify-center items-center gap-2 transition-all duration-300 shadow-buttonShadow"
                type="button"
                onClick={() => onClose()}
              >
                Cancel
              </button>
              <button
                className="w-full h-10 3xl:h-11 text-sm 3xl:text-base font-medium 3xl:font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-buttonShadow"
                onClick={() => shareWebcam()}
              >
                {/* {t('share')} */}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ShareWebcamModal;
