import React, { useState } from 'react';
import { IParticipant } from '../../../store/slices/interfaces/participant';
import Avatar from './avatar';
import ParticipantName from './name';
import RaiseHandIcon from './icons/raiseHand';
import MicIcon from './icons/mic';
import WebcamIcon from './icons/webcam';
import MenuIcon from './icons/menu';
import { store } from '../../../store';
import VisibilityIcon from './icons/visibility';
import PresenterIcon from './icons/presenterIcon';

import { Menu, Transition } from '@headlessui/react';

interface IParticipantComponentProps {
  participant: IParticipant;
}
const ParticipantComponent = ({ participant }: IParticipantComponentProps) => {
  const currentUser = store.getState().session.currentUser;
  const [volume, setVolume] = useState<number>(100);
  const [muted, setMuted] = useState<boolean>(false);
  const finalVolume = muted ? 0 : volume;

  return (
    <li className="mb-3 w-full list-none">
      <div className="flex items-center justify-between">
        <div className="left flex items-center ">
          <Avatar participant={participant} />
          <ParticipantName
            name={participant.name}
            isCurrentUser={currentUser?.userId === participant.userId}
          />
        </div>
        <div className="right ml-2 flex-auto flex items-center justify-end">
          <RaiseHandIcon userId={participant.userId} />
          <VisibilityIcon userId={participant.userId} />
          <PresenterIcon userId={participant.userId} />
          <Menu>
            {({ open }) => (
              <>
                <Menu.Button>
                  <MicIcon userId={participant.userId} />
                </Menu.Button>

                {/* Use the Transition component. */}
                <Transition
                  show={open}
                  enter="transition duration-100 ease-out"
                  enterFrom="transform scale-95 opacity-0"
                  enterTo="transform scale-100 opacity-100"
                  leave="transition duration-75 ease-out"
                  leaveFrom="transform scale-100 opacity-100"
                  leaveTo="transform scale-95 opacity-0"
                >
                  <Menu.Items
                    static
                    className="volume-popup-wrapper origin-top-right z-10 absolute right-0 top-0 mt-2 w-64 py-5 px-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none"
                  >
                    <section className="flex items-center">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={volume}
                        onChange={(event) => {
                          setVolume(event.target.valueAsNumber);
                        }}
                        className="range flex-1"
                      />
                      <p className="w-10 text-center text-sm">{finalVolume}</p>
                      <button
                        onClick={() => setMuted((m) => !m)}
                        className="w-4 h-4"
                      >
                        {muted ? (
                          <>
                            <svg
                              version="1.1"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 92 92"
                              className="w-full h-full"
                            >
                              <path
                                id="XMLID_788_"
                                d="M40.3,4.3c-1.5-0.6-3.3-0.2-4.5,0.9L16.5,25H7c-2.2,0-4,1.8-4,4V63c0,2.2,1.8,4,4,4h9.5l19.2,19.8
	c0.8,0.8,1.8,1.2,2.9,1.2c0.5,0,1.2-0.1,1.7-0.3c1.5-0.6,2.7-2.1,2.7-3.7V8C43,6.4,41.8,4.9,40.3,4.3z M35,74.2L21.2,60.2
	c-0.8-0.8-2-1.2-3.1-1.2H11V33h7.2c1.1,0,2.3-0.5,3.1-1.2L35,17.8V74.2z M87.9,58c1.5,1.6,1.5,4.1-0.1,5.7C87,64.4,86,64.8,85,64.8
	c-1,0-2.1-0.4-2.9-1.2L70.6,51.7L59.1,63.6c-0.8,0.8-1.8,1.2-2.9,1.2c-1,0-2-0.4-2.8-1.1c-1.6-1.5-1.6-4.1-0.1-5.7L65,46L53.4,34
	c-1.5-1.6-1.5-4.1,0.1-5.7c1.6-1.5,4.1-1.5,5.7,0.1l11.5,11.8l11.5-11.8c1.5-1.6,4.1-1.6,5.7-0.1c1.6,1.5,1.6,4.1,0.1,5.7L76.2,46
	L87.9,58z"
                                fill="#004D90"
                              />
                            </svg>
                          </>
                        ) : (
                          <>
                            <svg
                              version="1.1"
                              className="w-full h-full"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 512.002 512.002"
                            >
                              <path
                                d="M221.119,9.05L109.593,120.576H0v270.849h109.593l111.526,111.526h49.729V9.05H221.119z M223.052,437.29l-93.661-93.661
			H47.797V168.373h81.594l93.661-93.66V437.29z"
                                fill="#004D90"
                              />
                              <path
                                d="M343.511,137.71l-33.797,33.797c46.589,46.591,46.589,122.398,0,168.987l33.797,33.797
			C408.736,309.067,408.736,202.935,343.511,137.71z"
                                fill="#004D90"
                              />
                              <path
                                d="M428.005,53.216l-33.797,33.797c45.138,45.138,69.997,105.152,69.997,168.987s-24.859,123.85-69.997,168.987
			l33.797,33.797c54.167-54.165,83.997-126.182,83.997-202.785S482.172,107.381,428.005,53.216z"
                                fill="#004D90"
                              />
                            </svg>
                          </>
                        )}
                      </button>
                    </section>
                  </Menu.Items>
                </Transition>
              </>
            )}
          </Menu>
          <WebcamIcon userId={participant.userId} />
          {currentUser?.metadata?.is_admin &&
          currentUser.userId !== participant.userId ? (
            <MenuIcon userId={participant.userId} name={participant.name} />
          ) : null}
        </div>
      </div>
    </li>
  );
};

export default ParticipantComponent;
