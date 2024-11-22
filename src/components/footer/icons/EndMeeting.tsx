import { Button, Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useState } from 'react';
import { PopupCloseSVGIcon } from '../../../assets/Icons/PopupCloseSVGIcon';

export const EndMeeting = () => {
  const [isOpen, setIsOpen] = useState(false);
  function open() {
    setIsOpen(true);
  }
  function close() {
    setIsOpen(false);
  }
  return (
    <>
      <Button
        onClick={open}
        className="h-11 px-5 flex items-center rounded-[15px] text-base font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-buttonShadow"
      >
        End Meeting
      </Button>

      <Dialog
        open={isOpen}
        as="div"
        className="relative z-10 focus:outline-none"
        onClose={close}
      >
        <div className="EndMeetingPopup fixed inset-0 w-screen overflow-y-auto z-10">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel
              transition
              className="w-full max-w-96 bg-white border border-Gray-200 shadow-virtualPOP p-6 rounded-xl overflow-hidden duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
            >
              <DialogTitle
                as="h3"
                className="flex items-center justify-between text-lg font-semibold leading-7 text-Gray-950"
              >
                <span>Are you sure?</span>
                <Button onClick={close}>
                  <PopupCloseSVGIcon classes="text-Gray-600" />
                </Button>
              </DialogTitle>
              <div className="text-sm leading-5 text-Gray-700">
                You are about to end the current session.
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3">
                <Button
                  className="h-9 w-full flex items-center justify-center rounded-xl text-sm font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-buttonShadow"
                  onClick={close}
                >
                  Continue Meeting
                </Button>
                <Button className="h-9 w-full flex items-center justify-center rounded-xl text-sm font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-buttonShadow">
                  End Meeting
                </Button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};
