import React, { useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
// eslint-disable-next-line import/no-unresolved
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

import UploadFilesUI from './uploadFilesUI';
import { IWhiteboardOfficeFile } from '../../store/slices/interfaces/whiteboard';
import { useAppDispatch } from '../../store';
import { sleep } from '../../helpers/utils';
import { broadcastWhiteboardOfficeFile } from './helpers/handleRequestedWhiteboardData';
import { addWhiteboardUploadedOfficeFiles } from '../../store/slices/whiteboard';

interface IManageFilesProps {
  currentPage: number;
  excalidrawAPI: ExcalidrawImperativeAPI;
}

const ManageFiles = ({ currentPage, excalidrawAPI }: IManageFilesProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [refreshFileBrowser, setRefreshFileBrowser] = useState<number>(0);

  const openFileBrowser = () => {
    setRefreshFileBrowser(refreshFileBrowser + 1);
  };

  const defaultFile = async () => {
    const newFile: IWhiteboardOfficeFile = {
      fileId: 'default',
      fileName: 'default',
      filePath: 'default',
      totalPages: 10,
      currentPage: 1,
      pageFiles: '',
    };

    dispatch(addWhiteboardUploadedOfficeFiles(newFile));

    await sleep(500);
    broadcastWhiteboardOfficeFile(newFile);
  };

  const render = () => {
    return (
      <>
        <div className="menu relative z-10">
          <Menu>
            {({ open }) => (
              <>
                <Menu.Button className="footer-icon h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] rounded-full bg-[#F2F2F2] hover:bg-[#ECF4FF] flex items-center justify-center cursor-pointer">
                  <i className="pnm-menu-horizontal primaryColor text-[3px] lg:text-[5px]" />
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
                  {/* Mark this component as `static` */}
                  <Menu.Items
                    static
                    className="origin-top-right z-10 absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none"
                  >
                    <div role="none">
                      <Menu.Item>
                        <button
                          className="text-gray-700 rounded group flex items-center py-2 px-4 text-sm text-left w-full transition ease-in hover:text-secondaryColor"
                          onClick={() => defaultFile()}
                        >
                          Default
                        </button>
                      </Menu.Item>
                    </div>
                    <div className="" role="none">
                      <Menu.Item>
                        <button
                          onClick={() => openFileBrowser()}
                          className="w-[90px] text-xs h-7 flex items-center justify-center"
                        >
                          <i className="pnm-attachment primaryColor hover:secondaryColor text-[14px] opacity-50 mr-1" />
                          {t('whiteboard.upload-file')}
                        </button>
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </>
            )}
          </Menu>
        </div>
        <UploadFilesUI
          refreshFileBrowser={refreshFileBrowser}
          currentPage={currentPage}
          excalidrawAPI={excalidrawAPI}
        />
      </>
    );
  };

  return render();
};

export default ManageFiles;
