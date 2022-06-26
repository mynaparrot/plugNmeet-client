import React, { useState, useEffect } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { createSelector } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-unresolved
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

import UploadFilesUI from './uploadFilesUI';
import { IWhiteboardOfficeFile } from '../../store/slices/interfaces/whiteboard';
import { RootState, useAppDispatch, useAppSelector } from '../../store';
import { sleep } from '../../helpers/utils';
import { broadcastWhiteboardOfficeFile } from './helpers/handleRequestedWhiteboardData';
import { updateCurrentWhiteboardOfficeFileId } from '../../store/slices/whiteboard';

interface IManageFilesProps {
  currentPage: number;
  excalidrawAPI: ExcalidrawImperativeAPI;
}

const whiteboardUploadedOfficeFilesSelector = createSelector(
  (state: RootState) => state.whiteboard.whiteboardUploadedOfficeFiles,
  (whiteboardUploadedOfficeFiles) => whiteboardUploadedOfficeFiles,
);

const ManageFiles = ({ currentPage, excalidrawAPI }: IManageFilesProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const whiteboardUploadedOfficeFiles = useAppSelector(
    whiteboardUploadedOfficeFilesSelector,
  );
  const [refreshFileBrowser, setRefreshFileBrowser] = useState<number>(0);
  const [menuItems, setMenuItems] = useState<JSX.Element[]>([]);

  useEffect(() => {
    const elms = whiteboardUploadedOfficeFiles.map((f) => {
      return (
        <div
          role="none"
          className="border-b border-solid border-primaryColor/10 last:border-none"
          key={f.fileId}
        >
          <Menu.Item>
            <button
              className="!rounded !w-full flex items-center !px-3 !py-[0.4rem] !text-[10px] lg:!text-xs transition ease-in !bg-transparent hover:!bg-primaryColor hover:text-white text-gray-700"
              onClick={() => switchOfficeFile(f)}
            >
              {f.fileName}
            </button>
          </Menu.Item>
        </div>
      );
    });
    setMenuItems(elms);
    //eslint-disable-next-line
  }, [whiteboardUploadedOfficeFiles]);

  const openFileBrowser = () => {
    setRefreshFileBrowser(refreshFileBrowser + 1);
  };

  const switchOfficeFile = async (f: IWhiteboardOfficeFile) => {
    dispatch(updateCurrentWhiteboardOfficeFileId(f.fileId));
    await sleep(500);
    broadcastWhiteboardOfficeFile(f);
  };

  const render = () => {
    return (
      <>
        <div className="menu relative z-10">
          <Menu>
            {({ open }) => (
              <>
                <Menu.Button className="manage-icon h-[35px] lg:h-[40px] max-w !px-2 rounded-full bg-[#F2F2F2] hover:bg-[#ECF4FF] flex items-center justify-center cursor-pointer">
                  <>
                    <i className="pnm-attachment primaryColor hover:secondaryColor text-[14px] opacity-50 mr-1" />
                    {t('whiteboard.manage-files')}
                  </>
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
                    <div className="item-wrapper-uploaded-file overflow-y-auto max-h-[170px] scrollBar scrollBar2">
                      {menuItems}
                    </div>
                    <div className="py-3 !border-t-2 border-solid !border-primaryColor !mt-2">
                      <Menu.Item>
                        <button
                          onClick={() => openFileBrowser()}
                          className="w-[90px] !m-auto text-xs h-7 flex items-center justify-center"
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
